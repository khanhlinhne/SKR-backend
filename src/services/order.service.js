const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const payos = require('../config/payos');
const courseRepository = require('../repositories/course.repository');

const orderService = {
  async createOrder(userId, data) {
    const { courseId } = data;

    if (!courseId) {
      throw AppError.badRequest('Course ID is required');
    }

    const course = await prisma.mst_courses.findUnique({
      where: { course_id: courseId },
    });

    if (!course || course.status !== 'published') {
      throw AppError.notFound('Course not found or not published');
    }

    const amount = Number(course.price_amount) || 0;

    const existingRegistration = await prisma.pmt_course_purchases.findFirst({
      where: { user_id: userId, course_id: courseId }
    });

    if (existingRegistration) {
      if (existingRegistration.status === 'active') {
        throw AppError.conflict('Bạn đã sở hữu khóa học này rồi.');
      }

      if (existingRegistration.order_id) {
        await prisma.pmt_orders.deleteMany({
          where: { order_id: existingRegistration.order_id }
        });
      }

      await prisma.pmt_course_purchases.deleteMany({
        where: { purchase_id: existingRegistration.purchase_id }
      });
    }

    const payosOrderCode = Number(Date.now().toString().slice(-9));
    const orderCodeStr = `ORD-${payosOrderCode}`;

    const order = await prisma.pmt_orders.create({
      data: {
        user_id: userId,
        order_code: orderCodeStr,
        order_type: 'course',
        item_count: 1,
        subtotal_amount: amount,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: amount,
        currency_code: 'VND',
        payment_status: amount === 0 ? 'completed' : 'pending',
        created_by: userId,
        pmt_course_purchases: {
          create: {
            user_id: userId,
            course_id: courseId,
            purchase_price: amount,
            currency_code: 'VND',
            access_start_utc: new Date(),
            is_lifetime_access: true,
            status: amount === 0 ? 'active' : 'pending',
            purchase_type: 'manual',
            created_by: userId,
          }
        }
      },
      include: {
        pmt_course_purchases: true,
      },
    });

    if (amount === 0) {
      await courseRepository.updateCommerceStats(courseId);
      return { order, isFree: true };
    }

    const removeVietnameseTones = (str) => {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9 ]/g, '');
    };

    const courseName = course.course_name || 'KHOA HOC';
    const cleanCourseName = removeVietnameseTones(courseName).substring(0, 20).toUpperCase();
    const paymentAmount = Math.round(amount);
    const domain = process.env.CLIENT_URL || 'http://localhost:5173';

    const paymentBody = {
      orderCode: payosOrderCode,
      amount: paymentAmount,
      description: cleanCourseName,
      items: [
        {
          name: course.course_name.substring(0, 50),
          quantity: 1,
          price: paymentAmount,
        },
      ],
      returnUrl: `${domain}/checkout/success`,
      cancelUrl: `${domain}/checkout/cancel`,
    };

    let paymentLink;
    try {
      if (!payos) {
        throw new Error('PayOS client not initialized. Check PAYOS credentials in .env file.');
      }
      if (!payos.paymentRequests || typeof payos.paymentRequests.create !== 'function') {
        throw new Error('PayOS paymentRequests.create method not available');
      }
      paymentLink = await payos.paymentRequests.create(paymentBody);
    } catch (payosError) {
      console.error('PayOS Create Payment Link Error Detail:', payosError);
      throw AppError.internal(`PayOS Error: ${payosError.message || 'Lỗi kết nối cổng thanh toán'}`);
    }

    const vietQrImageUrl = `https://img.vietqr.io/image/${paymentLink.bin}-${paymentLink.accountNumber}-compact2.png?amount=${paymentAmount}&addInfo=${encodeURIComponent(paymentLink.description)}&accountName=${encodeURIComponent(paymentLink.accountName)}`;

    return {
      orderId: order.order_id,
      orderCode: orderCodeStr,
      amount,
      qrUrl: vietQrImageUrl,
      checkoutUrl: paymentLink.checkoutUrl,
      accountNo: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bankId: paymentLink.bin,
      addInfo: paymentLink.description
    };
  },

  async verifyOrderStatus(userId, orderCode) {
    const order = await prisma.pmt_orders.findUnique({
      where: { order_code: orderCode },
      include: { pmt_course_purchases: true }
    });

    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.user_id !== userId) {
      throw AppError.forbidden('You do not have permission to view this order');
    }

    if (order.payment_status === 'completed') {
      return { isCompleted: true, message: 'Thanh toán đã được xác nhận.' };
    }

    try {
      const payosCode = Number(orderCode.replace('ORD-', ''));
      const paymentInfo = await payos.paymentRequests.get(payosCode);

      console.log(`[PayOS Verify] Order ${orderCode} Status: ${paymentInfo.status}`);

      if (paymentInfo.status === 'PAID') {
        console.log(`[PayOS Verify] Order ${orderCode} detected as PAID. Updating database...`);

        await prisma.pmt_orders.update({
          where: { order_id: order.order_id },
          data: { payment_status: 'completed', paid_at_utc: new Date() }
        });

        await prisma.pmt_course_purchases.updateMany({
          where: { order_id: order.order_id },
          data: { status: 'active' }
        });

        const courseIds = [...new Set((order.pmt_course_purchases || []).map((purchase) => purchase.course_id).filter(Boolean))];
        await Promise.all(courseIds.map((courseId) => courseRepository.updateCommerceStats(courseId)));

        return { isCompleted: true, message: 'Thanh toán thành công qua PayOS.' };
      }
    } catch (error) {
      console.error('PayOS verify error:', error);
    }

    return { isCompleted: false, message: 'Chưa nhận được thanh toán từ PayOS.' };
  },

  async processPayOSWebhook(webhookBody) {
    try {
      const verifiedData = await payos.webhooks.verify(webhookBody);

      if (verifiedData.code === '00') {
        const payosOrderCode = verifiedData.orderCode;
        const orderCodeStr = `ORD-${payosOrderCode}`;

        const order = await prisma.pmt_orders.findUnique({
          where: { order_code: orderCodeStr },
          include: { pmt_course_purchases: true }
        });

        if (order && order.payment_status !== 'completed') {
          await prisma.pmt_orders.update({
            where: { order_id: order.order_id },
            data: {
              payment_status: 'completed',
              paid_at_utc: new Date(),
            }
          });

          await prisma.pmt_course_purchases.updateMany({
            where: { order_id: order.order_id },
            data: { status: 'active' }
          });

          const courseIds = [...new Set((order.pmt_course_purchases || []).map((purchase) => purchase.course_id).filter(Boolean))];
          await Promise.all(courseIds.map((courseId) => courseRepository.updateCommerceStats(courseId)));

          console.log(`Order ${orderCodeStr} marked as completed via webhook.`);
        }
      }

      return true;
    } catch (error) {
      console.error('Webhook verification failed:', error);
      throw error;
    }
  }
};

module.exports = orderService;

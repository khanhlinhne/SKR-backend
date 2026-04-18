const prisma = require("../config/prisma");
const courseRepository = require("./course.repository");

const orderInclude = {
  pmt_order_items: {
    orderBy: { created_at_utc: "asc" },
  },
  pmt_transactions: {
    orderBy: { created_at_utc: "desc" },
    take: 1,
  },
};

const paymentRepository = {
  async findActiveCoursePurchase(userId, courseId) {
    return prisma.pmt_course_purchases.findFirst({
      where: {
        user_id: userId,
        course_id: courseId,
        status: "active",
      },
      select: { purchase_id: true },
    });
  },

  async findCourseForCheckout(courseId) {
    return prisma.mst_courses.findUnique({
      where: { course_id: courseId },
      select: {
        course_id: true,
        course_name: true,
        is_active: true,
        status: true,
        is_free: true,
        price_amount: true,
        currency_code: true,
      },
    });
  },

  async findPackageForCheckout(packageId) {
    return prisma.mst_packages.findUnique({
      where: { package_id: packageId },
      select: {
        package_id: true,
        package_name: true,
        is_active: true,
        status: true,
        is_free: true,
        price_amount: true,
        currency_code: true,
        mst_package_courses: {
          orderBy: { display_order: "asc" },
          select: {
            subject_id: true,
            mst_subjects: {
              select: {
                subject_id: true,
                subject_name: true,
                is_active: true,
                status: true,
              },
            },
          },
        },
      },
    });
  },

  async createOrderWithTransaction({
    userId,
    orderCode,
    orderType,
    subtotalAmount,
    totalAmount,
    currencyCode,
    orderNotes,
    customerEmail,
    customerName,
    customerPhone,
    orderItems,
    transactionType,
    transactionAmount,
    sepayOrderCode,
    transactionMetadata,
    createdBy,
  }) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.pmt_orders.create({
        data: {
          order_code: orderCode,
          user_id: userId,
          order_type: orderType,
          item_count: orderItems.length || 1,
          subtotal_amount: subtotalAmount,
          total_amount: totalAmount,
          currency_code: currencyCode || "VND",
          order_notes: orderNotes || null,
          customer_email: customerEmail || null,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          payment_status: "pending",
          created_by: createdBy,
        },
      });

      if (orderItems.length > 0) {
        await tx.pmt_order_items.createMany({
          data: orderItems.map((item) => ({
            order_id: order.order_id,
            item_type: item.itemType,
            item_id: item.itemId,
            item_name: item.itemName,
            item_description: item.itemDescription || null,
            unit_price: item.unitPrice,
            quantity: item.quantity || 1,
            line_total: item.lineTotal,
            created_by: createdBy,
          })),
        });
      }

      const transaction = await tx.pmt_transactions.create({
        data: {
          order_id: order.order_id,
          user_id: userId,
          transaction_type: transactionType,
          amount: transactionAmount,
          currency_code: currencyCode || "VND",
          payment_method: "sepay",
          payment_status: "pending",
          sepay_order_code: sepayOrderCode || orderCode,
          transaction_metadata: transactionMetadata || null,
          created_by: createdBy,
        },
      });

      return { order, transaction };
    });
  },

  async updateTransactionGatewayData(transactionId, data, updatedBy) {
    return prisma.pmt_transactions.update({
      where: { transaction_id: transactionId },
      data: {
        ...(data.sepayOrderCode !== undefined && { sepay_order_code: data.sepayOrderCode }),
        ...(data.sepayTransactionId !== undefined && {
          sepay_transaction_id: data.sepayTransactionId,
        }),
        ...(data.sepayQrCode !== undefined && { sepay_qr_code: data.sepayQrCode }),
        ...(data.sepayPaymentUrl !== undefined && { sepay_payment_url: data.sepayPaymentUrl }),
        ...(data.sepayResponse !== undefined && { sepay_response: data.sepayResponse }),
        updated_by: updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async markTransactionFailed(transactionId, reason, gatewayResponse, updatedBy) {
    return prisma.$transaction([
      prisma.pmt_transactions.update({
        where: { transaction_id: transactionId },
        data: {
          payment_status: "failed",
          failed_at_utc: new Date(),
          failure_reason: reason || "SePay create payment failed",
          sepay_response: gatewayResponse || undefined,
          updated_by: updatedBy,
          updated_at_utc: new Date(),
        },
      }),
      prisma.pmt_orders.updateMany({
        where: { pmt_transactions: { some: { transaction_id: transactionId } } },
        data: {
          payment_status: "failed",
          updated_by: updatedBy,
          updated_at_utc: new Date(),
        },
      }),
    ]);
  },

  async findOrderByCodeForUser(orderCode, userId) {
    return prisma.pmt_orders.findFirst({
      where: {
        order_code: orderCode,
        user_id: userId,
      },
      include: orderInclude,
    });
  },

  async findOrderByCode(orderCode) {
    return prisma.pmt_orders.findUnique({
      where: { order_code: orderCode },
      include: orderInclude,
    });
  },

  async findTransactionBySepayOrderCode(sepayOrderCode) {
    return prisma.pmt_transactions.findFirst({
      where: { sepay_order_code: sepayOrderCode },
      include: {
        pmt_orders: {
          include: {
            pmt_order_items: true,
          },
        },
      },
    });
  },

  async completeTransactionAndGrantCourses({
    transactionId,
    sepayTransactionId,
    sepayResponse,
    paidAmount,
    updatedBy,
  }) {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.pmt_transactions.findUnique({
        where: { transaction_id: transactionId },
        include: {
          pmt_orders: {
            include: { pmt_order_items: true },
          },
        },
      });

      if (!transaction) {
        return null;
      }

      const courseItems = (transaction.pmt_orders?.pmt_order_items || []).filter((item) =>
        ["course", "course_included"].includes(item.item_type)
      );
      const courseIds = [...new Set(courseItems.map((item) => item.item_id).filter(Boolean))];

      if (transaction.payment_status === "completed") {
        await Promise.all(courseIds.map((courseId) => courseRepository.updateCommerceStats(courseId, tx)));
        return transaction;
      }

      const order = transaction.pmt_orders;

      await tx.pmt_transactions.update({
        where: { transaction_id: transactionId },
        data: {
          payment_status: "completed",
          paid_at_utc: new Date(),
          ...(sepayTransactionId ? { sepay_transaction_id: sepayTransactionId } : {}),
          ...(sepayResponse ? { sepay_response: sepayResponse } : {}),
          ...(paidAmount != null ? { amount: paidAmount } : {}),
          updated_by: updatedBy,
          updated_at_utc: new Date(),
        },
      });

      await tx.pmt_orders.update({
        where: { order_id: order.order_id },
        data: {
          payment_status: "completed",
          paid_at_utc: new Date(),
          updated_by: updatedBy,
          updated_at_utc: new Date(),
        },
      });

      for (const item of courseItems) {
        await tx.pmt_course_purchases.upsert({
          where: {
            course_id_user_id: {
              course_id: item.item_id,
              user_id: order.user_id,
            },
          },
          update: {
            order_id: order.order_id,
            purchase_type: order.order_type === "package_purchase" ? "package" : "purchased",
            purchase_price: item.line_total,
            currency_code: order.currency_code || "VND",
            status: "active",
            is_lifetime_access: true,
            updated_by: updatedBy,
            updated_at_utc: new Date(),
          },
          create: {
            course_id: item.item_id,
            user_id: order.user_id,
            order_id: order.order_id,
            purchase_type: order.order_type === "package_purchase" ? "package" : "purchased",
            purchase_price: item.line_total,
            currency_code: order.currency_code || "VND",
            is_lifetime_access: true,
            status: "active",
            created_by: updatedBy,
          },
        });
      }

      await Promise.all(courseIds.map((courseId) => courseRepository.updateCommerceStats(courseId, tx)));

      return tx.pmt_transactions.findUnique({
        where: { transaction_id: transactionId },
        include: {
          pmt_orders: {
            include: {
              pmt_order_items: true,
            },
          },
        },
      });
    });
  },
};

module.exports = paymentRepository;

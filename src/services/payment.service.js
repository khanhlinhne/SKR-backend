const { Prisma } = require("@prisma/client");
const AppError = require("../utils/AppError");
const paymentRepository = require("../repositories/payment.repository");
const userRepository = require("../repositories/user.repository");
const sepayService = require("./sepay.service");
const config = require("../config");

function toAmountNumber(value) {
  if (value == null) return 0;
  const parsed =
    typeof value === "object" && typeof value.toNumber === "function"
      ? value.toNumber()
      : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDecimal(value) {
  return new Prisma.Decimal(Number(value || 0).toFixed(2));
}

function generateOrderCode(prefix = "SKR") {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function allocateAmount(totalAmount, count) {
  const total = Number(totalAmount || 0);
  if (count <= 0) return [];
  const base = Math.floor((total * 100) / count);
  const values = Array.from({ length: count }, () => base);
  const remainder = Math.round(total * 100) - base * count;
  for (let i = 0; i < remainder; i += 1) {
    values[i] += 1;
  }
  return values.map((v) => v / 100);
}

function asObject(data) {
  return data && typeof data === "object" ? data : {};
}

function parseOrderCodeFromWebhook(payload = {}) {
  const direct = [
    payload.orderCode,
    payload.order_code,
    payload.sepay_order_code,
    payload.reference,
    payload.code,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim());

  if (direct.length > 0) {
    return direct[0];
  }

  const textSources = [
    payload.transferContent,
    payload.transfer_content,
    payload.description,
    payload.content,
    payload.note,
  ]
    .filter(Boolean)
    .map((v) => String(v));

  for (const text of textSources) {
    const matched = text.match(/SKR-[A-Za-z0-9-]+/i);
    if (matched) return matched[0];
  }

  return null;
}

function isSuccessfulWebhook(payload = {}) {
  const status = String(
    payload.status || payload.payment_status || payload.state || payload.result || payload.transferType || ""
  ).toLowerCase();

  if (!status) return true;
  if (["failed", "cancelled", "canceled", "error"].includes(status)) return false;
  if (["completed", "paid", "success", "succeeded", "in"].includes(status)) return true;
  return true;
}

function ensureWebhookAuthorized(req) {
  if (!config.sepay.webhookSecret) {
    return true;
  }

  const signature = req.headers["x-sepay-signature"] || req.headers["x-sepay-webhook-secret"];
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (signature === config.sepay.webhookSecret || bearer === config.sepay.webhookSecret) {
    return true;
  }

  throw AppError.forbidden("Invalid SePay webhook secret");
}

const paymentService = {
  async createCourseCheckout(userId, courseId, body = {}) {
    if (!userId) throw AppError.unauthorized("Authentication required");

    const user = await userRepository.findById(userId);
    if (!user || user.is_active === false) {
      throw AppError.notFound("User not found");
    }

    const existingPurchase = await paymentRepository.findActiveCoursePurchase(userId, courseId);
    if (existingPurchase) {
      throw AppError.conflict("You already own this course");
    }

    const course = await paymentRepository.findCourseForCheckout(courseId);
    if (!course || !course.is_active || course.status !== "published") {
      throw AppError.notFound("Course not available for purchase");
    }

    const coursePrice = toAmountNumber(course.price_amount);
    if (course.is_free || coursePrice <= 0) {
      throw AppError.badRequest("Course is free. No SePay checkout is required.");
    }

    const orderCode = generateOrderCode("SKR-COURSE");
    const amount = coursePrice;
    const currency = course.currency_code || "VND";
    const description = body.description || `Thanh toan khoa hoc: ${course.course_name}`;

    const { order, transaction } = await paymentRepository.createOrderWithTransaction({
      userId,
      orderCode,
      orderType: "course_purchase",
      subtotalAmount: toDecimal(amount),
      totalAmount: toDecimal(amount),
      currencyCode: currency,
      orderNotes: body.orderNotes || null,
      customerEmail: user.email || null,
      customerName: user.full_name || user.display_name || null,
      customerPhone: user.phone_number || null,
      orderItems: [
        {
          itemType: "course",
          itemId: course.course_id,
          itemName: course.course_name,
          itemDescription: "Course purchase via SePay",
          unitPrice: toDecimal(amount),
          quantity: 1,
          lineTotal: toDecimal(amount),
        },
      ],
      transactionType: "payment",
      transactionAmount: toDecimal(amount),
      sepayOrderCode: orderCode,
      transactionMetadata: { source: "course_checkout", courseId: course.course_id },
      createdBy: userId,
    });

    try {
      const gateway = await sepayService.createPaymentRequest({
        orderCode,
        amount,
        description,
        metadata: { orderCode, orderId: order.order_id, courseId: course.course_id, userId },
      });

      await paymentRepository.updateTransactionGatewayData(
        transaction.transaction_id,
        {
          sepayOrderCode: gateway.sepayOrderCode || orderCode,
          sepayTransactionId: gateway.sepayTransactionId,
          sepayPaymentUrl: gateway.paymentUrl,
          sepayQrCode: gateway.qrCode,
          sepayResponse: gateway.raw,
        },
        userId
      );

      const latestOrder = await paymentRepository.findOrderByCodeForUser(orderCode, userId);

      return {
        orderCode,
        orderId: order.order_id,
        paymentStatus: latestOrder?.payment_status || "pending",
        amount,
        currencyCode: currency,
        transferInfo: gateway.transferInfo || null,
        paymentUrl: gateway.paymentUrl || null,
        qrCode: gateway.qrCode || null,
      };
    } catch (error) {
      await paymentRepository.markTransactionFailed(
        transaction.transaction_id,
        error.message,
        asObject(error),
        userId
      );
      throw error;
    }
  },

  async createPackageCheckout(userId, packageId, body = {}) {
    if (!userId) throw AppError.unauthorized("Authentication required");

    const user = await userRepository.findById(userId);
    if (!user || user.is_active === false) {
      throw AppError.notFound("User not found");
    }

    const pkg = await paymentRepository.findPackageForCheckout(packageId);
    if (!pkg || !pkg.is_active || pkg.status !== "published") {
      throw AppError.notFound("Package not available for purchase");
    }

    const packagePrice = toAmountNumber(pkg.price_amount);
    if (pkg.is_free || packagePrice <= 0) {
      throw AppError.badRequest("Package is free. No SePay checkout is required.");
    }

    const availableCourses = (pkg.mst_package_courses || [])
      .map((entry) => entry.mst_subjects)
      .filter((course) => course && course.is_active && course.status === "published");

    if (availableCourses.length === 0) {
      throw AppError.badRequest("Package has no purchasable courses");
    }

    const notOwnedCourses = [];
    for (const course of availableCourses) {
      // eslint-disable-next-line no-await-in-loop
      const alreadyOwned = await paymentRepository.findActiveCoursePurchase(userId, course.subject_id);
      if (!alreadyOwned) {
        notOwnedCourses.push(course);
      }
    }

    if (notOwnedCourses.length === 0) {
      throw AppError.conflict("You already own all courses in this package");
    }

    const orderCode = generateOrderCode("SKR-PACKAGE");
    const currency = pkg.currency_code || "VND";
    const amount = packagePrice;
    const description = body.description || `Thanh toan goi khoa hoc: ${pkg.package_name}`;
    const allocated = allocateAmount(amount, notOwnedCourses.length);

    const orderItems = notOwnedCourses.map((course, index) => ({
      itemType: "course_included",
      itemId: course.subject_id,
      itemName: course.subject_name,
      itemDescription: `Included from package ${pkg.package_name}`,
      unitPrice: toDecimal(allocated[index]),
      quantity: 1,
      lineTotal: toDecimal(allocated[index]),
    }));

    const { order, transaction } = await paymentRepository.createOrderWithTransaction({
      userId,
      orderCode,
      orderType: "package_purchase",
      subtotalAmount: toDecimal(amount),
      totalAmount: toDecimal(amount),
      currencyCode: currency,
      orderNotes: body.orderNotes || null,
      customerEmail: user.email || null,
      customerName: user.full_name || user.display_name || null,
      customerPhone: user.phone_number || null,
      orderItems,
      transactionType: "payment",
      transactionAmount: toDecimal(amount),
      sepayOrderCode: orderCode,
      transactionMetadata: {
        source: "package_checkout",
        packageId: pkg.package_id,
        includedCourseIds: notOwnedCourses.map((item) => item.subject_id),
      },
      createdBy: userId,
    });

    try {
      const gateway = await sepayService.createPaymentRequest({
        orderCode,
        amount,
        description,
        metadata: { orderCode, orderId: order.order_id, packageId: pkg.package_id, userId },
      });

      await paymentRepository.updateTransactionGatewayData(
        transaction.transaction_id,
        {
          sepayOrderCode: gateway.sepayOrderCode || orderCode,
          sepayTransactionId: gateway.sepayTransactionId,
          sepayPaymentUrl: gateway.paymentUrl,
          sepayQrCode: gateway.qrCode,
          sepayResponse: gateway.raw,
        },
        userId
      );

      const latestOrder = await paymentRepository.findOrderByCodeForUser(orderCode, userId);

      return {
        orderCode,
        orderId: order.order_id,
        paymentStatus: latestOrder?.payment_status || "pending",
        amount,
        currencyCode: currency,
        packageId: pkg.package_id,
        includedCourses: notOwnedCourses.map((item) => ({
          courseId: item.subject_id,
          courseName: item.subject_name,
        })),
        transferInfo: gateway.transferInfo || null,
        paymentUrl: gateway.paymentUrl || null,
        qrCode: gateway.qrCode || null,
      };
    } catch (error) {
      await paymentRepository.markTransactionFailed(
        transaction.transaction_id,
        error.message,
        asObject(error),
        userId
      );
      throw error;
    }
  },

  async getMyOrder(userId, orderCode) {
    if (!userId) throw AppError.unauthorized("Authentication required");

    const order = await paymentRepository.findOrderByCodeForUser(orderCode, userId);
    if (!order) {
      throw AppError.notFound("Order not found");
    }

    const latestTx = order.pmt_transactions?.[0] || null;

    return {
      orderId: order.order_id,
      orderCode: order.order_code,
      orderType: order.order_type,
      paymentStatus: order.payment_status,
      totalAmount:
        typeof order.total_amount?.toNumber === "function"
          ? order.total_amount.toNumber()
          : Number(order.total_amount || 0),
      currencyCode: order.currency_code || "VND",
      paidAtUtc: order.paid_at_utc,
      createdAtUtc: order.created_at_utc,
      items: (order.pmt_order_items || []).map((item) => ({
        itemType: item.item_type,
        itemId: item.item_id,
        itemName: item.item_name,
        quantity: item.quantity || 1,
        lineTotal:
          typeof item.line_total?.toNumber === "function"
            ? item.line_total.toNumber()
            : Number(item.line_total || 0),
      })),
      transaction: latestTx
        ? {
            transactionId: latestTx.transaction_id,
            sepayOrderCode: latestTx.sepay_order_code,
            sepayTransactionId: latestTx.sepay_transaction_id,
            paymentStatus: latestTx.payment_status,
            paymentUrl: latestTx.sepay_payment_url,
            qrCode: latestTx.sepay_qr_code,
            paidAtUtc: latestTx.paid_at_utc,
            failureReason: latestTx.failure_reason,
          }
        : null,
    };
  },

  async handleSepayWebhook(req) {
    ensureWebhookAuthorized(req);
    const payload = asObject(req.body);

    if (!isSuccessfulWebhook(payload)) {
      return {
        accepted: true,
        ignored: true,
        reason: "Webhook status is not successful",
      };
    }

    const orderCode = parseOrderCodeFromWebhook(payload);
    if (!orderCode) {
      throw AppError.badRequest("Cannot resolve orderCode from SePay webhook payload");
    }

    const transaction = await paymentRepository.findTransactionBySepayOrderCode(orderCode);
    if (!transaction) {
      throw AppError.notFound("Transaction not found by SePay order code");
    }

    const paidAmountRaw = payload.amount || payload.amount_in || payload.value;
    const paidAmount = paidAmountRaw != null ? toDecimal(Number(paidAmountRaw)) : undefined;

    const completed = await paymentRepository.completeTransactionAndGrantCourses({
      transactionId: transaction.transaction_id,
      sepayTransactionId:
        payload.transactionId || payload.transaction_id || payload.sepay_transaction_id || null,
      sepayResponse: payload,
      paidAmount,
      updatedBy: transaction.user_id,
    });

    return {
      accepted: true,
      orderCode,
      orderId: completed?.pmt_orders?.order_id || transaction.order_id,
      transactionId: transaction.transaction_id,
      paymentStatus: completed?.payment_status || "completed",
    };
  },
};

module.exports = paymentService;

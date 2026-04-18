const { Prisma } = require("@prisma/client");
const registrationRepository = require("../repositories/registration.repository");
const userRepository = require("../repositories/user.repository");
const courseRepository = require("../repositories/course.repository");
const AppError = require("../utils/AppError");
const registrationDto = require("../dtos/registration.dto");

function mapDecimal(d) {
  if (d === null || d === undefined) return null;
  return typeof d === "object" && typeof d.toNumber === "function" ? d.toNumber() : Number(d);
}

const registrationService = {
  async listForAdmin(query) {
    const { items, totalItems, page, limit } = await registrationRepository.findManyForAdmin(query);
    const totalPages = Math.ceil(totalItems / limit) || 1;
    return {
      items: items.map(registrationDto.toListItem),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  async getByIdForAdmin(purchaseId) {
    const row = await registrationRepository.findByIdForAdmin(purchaseId);
    if (!row) {
      throw AppError.notFound("Registration not found");
    }
    return registrationDto.toDetail(row);
  },

  async createByAdmin(adminUserId, body) {
    const user = await userRepository.findById(body.userId);
    if (!user) {
      throw AppError.badRequest("User not found");
    }
    const course = await courseRepository.findById(body.courseId);
    if (!course) {
      throw AppError.badRequest("Course not found");
    }

    const data = {
      course_id: body.courseId,
      user_id: body.userId,
      order_id: body.orderId || null,
      purchase_price: body.purchasePrice != null ? new Prisma.Decimal(body.purchasePrice) : new Prisma.Decimal(0),
      currency_code: body.currencyCode || "VND",
      access_start_utc: body.accessStartUtc ? new Date(body.accessStartUtc) : new Date(),
      access_end_utc: body.accessEndUtc ? new Date(body.accessEndUtc) : null,
      is_lifetime_access: body.isLifetimeAccess !== false,
      purchase_type: body.purchaseType || "manual",
      status: body.status || "active",
      progress_percent: body.progressPercent != null ? new Prisma.Decimal(body.progressPercent) : new Prisma.Decimal(0),
      chapters_completed: body.chaptersCompleted ?? 0,
      lessons_completed: body.lessonsCompleted ?? 0,
      created_by: adminUserId,
    };

    try {
      const row = await registrationRepository.create(data);
      await courseRepository.updateCommerceStats(body.courseId);
      return registrationDto.toDetail(row);
    } catch (e) {
      if (e.code === "P2002") {
        throw AppError.conflict("This user is already registered for this course");
      }
      throw e;
    }
  },

  async updateByAdmin(adminUserId, purchaseId, body) {
    const existing = await registrationRepository.findByIdForAdmin(purchaseId);
    if (!existing) {
      throw AppError.notFound("Registration not found");
    }

    const data = {
      updated_by: adminUserId,
      updated_at_utc: new Date(),
    };

    if (body.orderId !== undefined) data.order_id = body.orderId;
    if (body.purchasePrice !== undefined) data.purchase_price = new Prisma.Decimal(body.purchasePrice);
    if (body.currencyCode !== undefined) data.currency_code = body.currencyCode;
    if (body.accessStartUtc !== undefined) data.access_start_utc = body.accessStartUtc ? new Date(body.accessStartUtc) : null;
    if (body.accessEndUtc !== undefined) data.access_end_utc = body.accessEndUtc ? new Date(body.accessEndUtc) : null;
    if (body.isLifetimeAccess !== undefined) data.is_lifetime_access = body.isLifetimeAccess;
    if (body.purchaseType !== undefined) data.purchase_type = body.purchaseType;
    if (body.status !== undefined) data.status = body.status;
    if (body.progressPercent !== undefined) data.progress_percent = new Prisma.Decimal(body.progressPercent);
    if (body.chaptersCompleted !== undefined) data.chapters_completed = body.chaptersCompleted;
    if (body.lessonsCompleted !== undefined) data.lessons_completed = body.lessonsCompleted;
    if (body.lastAccessedAtUtc !== undefined) {
      data.last_accessed_at_utc = body.lastAccessedAtUtc ? new Date(body.lastAccessedAtUtc) : null;
    }
    if (body.completedAtUtc !== undefined) {
      data.completed_at_utc = body.completedAtUtc ? new Date(body.completedAtUtc) : null;
    }
    if (body.certificateIssued !== undefined) data.certificate_issued = body.certificateIssued;
    if (body.certificateUrl !== undefined) data.certificate_url = body.certificateUrl;

    const row = await registrationRepository.update(purchaseId, data);
    await courseRepository.updateCommerceStats(existing.course_id);
    return registrationDto.toDetail(row);
  },

  async getReport(query) {
    const { from, to, transactionLimit } = query;
    const summary = await registrationRepository.getReportSummary({ from, to });
    const recentTransactions = await registrationRepository.findRecentTransactions({
      limit: transactionLimit || 50,
      from,
      to,
    });

    return {
      summary: {
        period: summary.period,
        registrations: {
          total: summary.registrations.total,
          byStatus: summary.registrations.byStatus,
          sumPurchasePrice: mapDecimal(summary.registrations.sumPurchasePrice),
        },
        transactions: {
          count: summary.transactions.count,
          sumPaidAmount: mapDecimal(summary.transactions.sumPaidAmount),
        },
        orders: {
          sumCompletedOrderTotal: mapDecimal(summary.orders.sumCompletedOrderTotal),
        },
      },
      recentTransactions: recentTransactions.map((t) => ({
        transactionId: t.transaction_id,
        orderId: t.order_id,
        userId: t.user_id,
        transactionType: t.transaction_type,
        amount: mapDecimal(t.amount),
        currencyCode: t.currency_code,
        paymentStatus: t.payment_status,
        paidAtUtc: t.paid_at_utc,
        createdAtUtc: t.created_at_utc,
        orderCode: t.pmt_orders?.order_code,
        orderType: t.pmt_orders?.order_type,
        orderTotalAmount: mapDecimal(t.pmt_orders?.total_amount),
        userEmail: t.mst_users?.email,
        userFullName: t.mst_users?.full_name,
      })),
    };
  },
};

module.exports = registrationService;

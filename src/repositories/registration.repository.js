const prisma = require("../config/prisma");

const userSelect = {
  user_id: true,
  email: true,
  full_name: true,
  display_name: true,
  phone_number: true,
};

const courseSelect = {
  course_id: true,
  course_code: true,
  course_name: true,
  price_amount: true,
};

const orderSelect = {
  order_id: true,
  order_code: true,
  total_amount: true,
  payment_status: true,
  paid_at_utc: true,
};

const registrationInclude = {
  mst_users: { select: userSelect },
  mst_courses: { select: courseSelect },
  pmt_orders: { select: orderSelect },
};

function buildWhere({ userId, courseId, status, search }) {
  const and = [];
  if (userId) and.push({ user_id: userId });
  if (courseId) and.push({ course_id: courseId });
  if (status) and.push({ status });
  if (search && String(search).trim()) {
    const s = String(search).trim();
    and.push({
      OR: [
        { mst_users: { email: { contains: s, mode: "insensitive" } } },
        { mst_users: { full_name: { contains: s, mode: "insensitive" } } },
        { mst_users: { username: { contains: s, mode: "insensitive" } } },
        { mst_courses: { course_name: { contains: s, mode: "insensitive" } } },
        { mst_courses: { course_code: { contains: s, mode: "insensitive" } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

const registrationRepository = {
  async findManyForAdmin(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const where = buildWhere({
      userId: query.userId,
      courseId: query.courseId,
      status: query.status,
      search: query.search,
    });

    const [items, totalItems] = await Promise.all([
      prisma.pmt_course_purchases.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchased_at_utc: "desc" },
        include: registrationInclude,
      }),
      prisma.pmt_course_purchases.count({ where }),
    ]);

    return { items, totalItems, page, limit };
  },

  async findByIdForAdmin(purchaseId) {
    return prisma.pmt_course_purchases.findUnique({
      where: { purchase_id: purchaseId },
      include: registrationInclude,
    });
  },

  async create(data) {
    return prisma.pmt_course_purchases.create({
      data,
      include: registrationInclude,
    });
  },

  async update(purchaseId, data) {
    return prisma.pmt_course_purchases.update({
      where: { purchase_id: purchaseId },
      data,
      include: registrationInclude,
    });
  },

  /**
   * Aggregates for management report: registrations + linked payment activity.
   */
  async getReportSummary({ from, to }) {
    const purchaseDate = {};
    if (from) purchaseDate.gte = new Date(from);
    if (to) purchaseDate.lte = new Date(to);
    const purchaseWhere = Object.keys(purchaseDate).length
      ? { purchased_at_utc: purchaseDate }
      : {};

    const txDate = {};
    if (from) txDate.gte = new Date(from);
    if (to) txDate.lte = new Date(to);
    const txWhere = Object.keys(txDate).length ? { created_at_utc: txDate } : {};

    const [
      totalRegistrations,
      statusGroups,
      purchasePriceSum,
      totalTransactions,
      txPaidSum,
      orderPaidSum,
    ] = await Promise.all([
      prisma.pmt_course_purchases.count({ where: purchaseWhere }),
      prisma.pmt_course_purchases.groupBy({
        by: ["status"],
        where: purchaseWhere,
        _count: { _all: true },
      }),
      prisma.pmt_course_purchases.aggregate({
        where: purchaseWhere,
        _sum: { purchase_price: true },
      }),
      prisma.pmt_transactions.count({ where: txWhere }),
      prisma.pmt_transactions.aggregate({
        where: { ...txWhere, payment_status: "completed" },
        _sum: { amount: true },
      }),
      prisma.pmt_orders.aggregate({
        where: {
          ...(Object.keys(txDate).length ? { paid_at_utc: txDate } : {}),
          payment_status: "completed",
        },
        _sum: { total_amount: true },
      }),
    ]);

    const byStatus = {};
    for (const row of statusGroups) {
      byStatus[row.status || "unknown"] = row._count._all;
    }

    return {
      period: { from: from || null, to: to || null },
      registrations: {
        total: totalRegistrations,
        byStatus,
        sumPurchasePrice: purchasePriceSum._sum.purchase_price,
      },
      transactions: {
        count: totalTransactions,
        sumPaidAmount: txPaidSum._sum.amount,
      },
      orders: {
        sumCompletedOrderTotal: orderPaidSum._sum.total_amount,
      },
    };
  },

  async findRecentTransactions({ limit = 50, from, to }) {
    const txDate = {};
    if (from) txDate.gte = new Date(from);
    if (to) txDate.lte = new Date(to);
    const where = Object.keys(txDate).length ? { created_at_utc: txDate } : {};

    return prisma.pmt_transactions.findMany({
      where,
      take: Math.min(Math.max(limit, 1), 100),
      orderBy: { created_at_utc: "desc" },
      select: {
        transaction_id: true,
        order_id: true,
        user_id: true,
        transaction_type: true,
        amount: true,
        currency_code: true,
        payment_status: true,
        paid_at_utc: true,
        created_at_utc: true,
        pmt_orders: {
          select: { order_code: true, order_type: true, total_amount: true },
        },
        mst_users: {
          select: { email: true, full_name: true },
        },
      },
    });
  },
};

module.exports = registrationRepository;

const prisma = require("../config/prisma");

const dashboardRepository = {
  async countUsers(where) {
    return prisma.mst_users.count({ where });
  },

  async countCourses(where) {
    return prisma.mst_courses.count({ where });
  },

  async countOrders(where) {
    return prisma.pmt_orders.count({ where });
  },

  async sumOrderRevenue(where) {
    const r = await prisma.pmt_orders.aggregate({
      where,
      _sum: { total_amount: true },
    });
    return r._sum.total_amount;
  },

  /**
   * Monthly revenue (completed orders) between start and end (inclusive upper bound by day).
   */
  async getMonthlyRevenueSeries(startUtc, endUtc) {
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR FROM paid_at_utc)::int AS year,
        EXTRACT(MONTH FROM paid_at_utc)::int AS month,
        COALESCE(SUM(total_amount), 0)::float8 AS total
      FROM pmt_orders
      WHERE payment_status = 'completed'
        AND paid_at_utc IS NOT NULL
        AND paid_at_utc >= ${startUtc}
        AND paid_at_utc <= ${endUtc}
      GROUP BY EXTRACT(YEAR FROM paid_at_utc), EXTRACT(MONTH FROM paid_at_utc)
      ORDER BY year ASC, month ASC
    `;
    return rows;
  },

  async getTopCoursesByPurchaseRevenue(take = 4) {
    const grouped = await prisma.pmt_course_purchases.groupBy({
      by: ["course_id"],
      where: { status: "active" },
      _sum: { purchase_price: true },
      _count: { _all: true },
      orderBy: { _sum: { purchase_price: "desc" } },
      take,
    });
    if (!grouped.length) return [];

    const courseIds = grouped.map((g) => g.course_id);
    const courses = await prisma.mst_courses.findMany({
      where: { course_id: { in: courseIds } },
      select: {
        course_id: true,
        course_name: true,
        course_code: true,
        rating_average: true,
        rating_count: true,
        purchase_count: true,
      },
    });
    const byId = new Map(courses.map((c) => [c.course_id, c]));

    return grouped.map((g, index) => ({
      rank: index + 1,
      courseId: g.course_id,
      course: byId.get(g.course_id) || null,
      studentCount: g._count._all,
      revenue: g._sum.purchase_price,
    }));
  },

  /** Revenue in date range per course (for growth). */
  async sumPurchaseRevenueByCourse(courseId, startUtc, endUtc) {
    const r = await prisma.pmt_course_purchases.aggregate({
      where: {
        course_id: courseId,
        status: "active",
        purchased_at_utc: { gte: startUtc, lte: endUtc },
      },
      _sum: { purchase_price: true },
    });
    return r._sum.purchase_price;
  },

  async findRecentUsers(take = 10) {
    return prisma.mst_users.findMany({
      take,
      orderBy: { created_at_utc: "desc" },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        display_name: true,
        avatar_url: true,
        email_verified: true,
        is_active: true,
        created_at_utc: true,
        mst_user_roles: {
          where: {
            is_active: true,
            OR: [{ expires_at_utc: null }, { expires_at_utc: { gt: new Date() } }],
          },
          take: 3,
          orderBy: { assigned_at_utc: "desc" },
          include: {
            mst_roles: { select: { role_code: true, role_name: true } },
          },
        },
      },
    });
  },

  async findRecentOrders(take = 10) {
    return prisma.pmt_orders.findMany({
      take,
      orderBy: { created_at_utc: "desc" },
      select: {
        order_id: true,
        order_code: true,
        total_amount: true,
        currency_code: true,
        customer_name: true,
        customer_email: true,
        payment_status: true,
        created_at_utc: true,
        paid_at_utc: true,
        mst_users: {
          select: {
            user_id: true,
            full_name: true,
            display_name: true,
            email: true,
            avatar_url: true,
          },
        },
        pmt_order_items: {
          take: 3,
          select: {
            item_name: true,
            item_type: true,
            item_id: true,
          },
        },
      },
    });
  },
};

module.exports = dashboardRepository;

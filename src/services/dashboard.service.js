const dashboardRepository = require("../repositories/dashboard.repository");

function num(d) {
  if (d === null || d === undefined) return 0;
  return typeof d === "object" && typeof d.toNumber === "function" ? d.toNumber() : Number(d);
}

function pctChange(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

/**
 * Current period: [currentStart, now]. Previous same-length window ends immediately before currentStart.
 */
function getComparableRanges(period) {
  const now = new Date();
  let currentStart;
  if (period === "week") {
    const d = new Date(now);
    const day = (d.getUTCDay() + 6) % 7;
    currentStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  } else if (period === "year") {
    currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  } else {
    currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const msCurrent = now.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(currentStart.getTime() - msCurrent);
  return {
    currentStart,
    currentEnd: now,
    previousStart,
    previousEnd,
  };
}

function buildLast12MonthBuckets() {
  const now = new Date();
  const buckets = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      amount: 0,
    });
  }
  return buckets;
}

function mergeMonthlyRevenue(buckets, rows) {
  const key = (y, m) => `${y}-${m}`;
  const map = new Map();
  for (const b of buckets) {
    map.set(key(b.year, b.month), b);
  }
  for (const r of rows) {
    const y = r.year;
    const m = r.month;
    const b = map.get(key(y, m));
    if (b) b.amount = Number(r.total) || 0;
  }
  return buckets.map((b, i) => ({
    year: b.year,
    month: b.month,
    label: `T${i + 1}`,
    amount: Math.round(b.amount),
  }));
}

async function mapFeaturedWithGrowth(rows) {
  const now = new Date();
  const end = now;
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const end30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const out = [];
  for (const row of rows) {
    const courseId = row.courseId;
    const [sum30, sumPrev30] = await Promise.all([
      dashboardRepository.sumPurchaseRevenueByCourse(courseId, start30, end),
      dashboardRepository.sumPurchaseRevenueByCourse(courseId, start60, end30),
    ]);
    const a = num(sum30);
    const b = num(sumPrev30);
    out.push({
      rank: row.rank,
      courseId: row.courseId,
      courseName: row.course?.course_name || null,
      courseCode: row.course?.course_code || null,
      studentCount: row.studentCount,
      rating: row.course?.rating_average != null ? num(row.course.rating_average) : null,
      ratingCount: row.course?.rating_count ?? 0,
      revenue: Math.round(num(row.revenue)),
      growthPercent: pctChange(a, b),
    });
  }
  return out;
}

function mapRecentUser(u) {
  const primaryRole = u.mst_user_roles?.[0]?.mst_roles;
  const roleLabel = primaryRole?.role_name || primaryRole?.role_code || "user";
  let statusLabel = "pending";
  if (u.is_active && u.email_verified) statusLabel = "active";
  else if (u.is_active && !u.email_verified) statusLabel = "pending";
  else if (!u.is_active) statusLabel = "inactive";

  return {
    userId: u.user_id,
    email: u.email,
    fullName: u.full_name || u.display_name || u.email,
    avatarUrl: u.avatar_url,
    roleLabel,
    roleCode: primaryRole?.role_code || null,
    statusLabel,
    emailVerified: u.email_verified,
    joinedAtUtc: u.created_at_utc,
  };
}

function mapRecentOrder(o) {
  const firstItem = o.pmt_order_items?.[0];
  const itemLabel = firstItem?.item_name || "—";
  return {
    orderId: o.order_id,
    orderCode: o.order_code,
    displayCode: o.order_code ? `#${o.order_code}` : `#${o.order_id.slice(0, 8)}`,
    courseOrItemName: itemLabel,
    amount: Number(o.total_amount) || 0,
    currencyCode: o.currency_code || "VND",
    paymentStatus: o.payment_status,
    createdAtUtc: o.created_at_utc,
    paidAtUtc: o.paid_at_utc,
  };
}

const dashboardService = {
  async getDashboard(period = "month") {
    const p = period === "week" || period === "year" ? period : "month";
    const { currentStart, currentEnd, previousStart, previousEnd } = getComparableRanges(p);

    const [
      totalUsersAll,
      totalCoursesAll,
      totalOrdersAll,
      newUsersCurr,
      newUsersPrev,
      newCoursesCurr,
      newCoursesPrev,
      ordersCurr,
      ordersPrev,
      revenueCurr,
      revenuePrev,
      monthlyRows,
      topRaw,
      recentUsers,
      recentOrders,
    ] = await Promise.all([
      dashboardRepository.countUsers({}),
      dashboardRepository.countCourses({ status: "published", is_active: true }),
      dashboardRepository.countOrders({}),
      dashboardRepository.countUsers({
        created_at_utc: { gte: currentStart, lte: currentEnd },
      }),
      dashboardRepository.countUsers({
        created_at_utc: { gte: previousStart, lte: previousEnd },
      }),
      dashboardRepository.countCourses({
        created_at_utc: { gte: currentStart, lte: currentEnd },
        status: "published",
      }),
      dashboardRepository.countCourses({
        created_at_utc: { gte: previousStart, lte: previousEnd },
        status: "published",
      }),
      dashboardRepository.countOrders({
        created_at_utc: { gte: currentStart, lte: currentEnd },
      }),
      dashboardRepository.countOrders({
        created_at_utc: { gte: previousStart, lte: previousEnd },
      }),
      dashboardRepository.sumOrderRevenue({
        payment_status: "completed",
        paid_at_utc: { gte: currentStart, lte: currentEnd },
      }),
      dashboardRepository.sumOrderRevenue({
        payment_status: "completed",
        paid_at_utc: { gte: previousStart, lte: previousEnd },
      }),
      dashboardRepository.getMonthlyRevenueSeries(
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1)),
        currentEnd
      ),
      dashboardRepository.getTopCoursesByPurchaseRevenue(4),
      dashboardRepository.findRecentUsers(10),
      dashboardRepository.findRecentOrders(10),
    ]);

    const buckets = buildLast12MonthBuckets();
    const revenueByMonth = mergeMonthlyRevenue(buckets, monthlyRows);

    const featuredCourses = await mapFeaturedWithGrowth(topRaw);

    return {
      period: p,
      periodBounds: {
        currentStartUtc: currentStart,
        currentEndUtc: currentEnd,
        previousStartUtc: previousStart,
        previousEndUtc: previousEnd,
      },
      summary: {
        users: {
          total: totalUsersAll,
          newInPeriod: newUsersCurr,
          changePercent: pctChange(newUsersCurr, newUsersPrev),
        },
        courses: {
          total: totalCoursesAll,
          newInPeriod: newCoursesCurr,
          changePercent: pctChange(newCoursesCurr, newCoursesPrev),
        },
        orders: {
          total: totalOrdersAll,
          countInPeriod: ordersCurr,
          changePercent: pctChange(ordersCurr, ordersPrev),
        },
        revenue: {
          currencyCode: "VND",
          totalInPeriod: Math.round(num(revenueCurr)),
          changePercent: pctChange(num(revenueCurr), num(revenuePrev)),
        },
      },
      revenueByMonth,
      featuredCourses,
      recentUsers: recentUsers.map(mapRecentUser),
      recentOrders: recentOrders.map(mapRecentOrder),
    };
  },
};

module.exports = dashboardService;

const dashboardRepository = require("../repositories/dashboard.repository");

const PERIOD_OPTIONS = [
  { value: "week", label: "Tu\u1ea7n" },
  { value: "month", label: "Th\u00e1ng" },
  { value: "year", label: "N\u0103m" },
];

function num(d) {
  if (d === null || d === undefined) return 0;
  return typeof d === "object" && typeof d.toNumber === "function" ? d.toNumber() : Number(d);
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function pctChange(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
  if (p === 0) return c > 0 ? 100 : 0;
  return round1(((c - p) / p) * 100);
}

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

function formatInteger(value) {
  return Math.round(Number(value) || 0).toLocaleString("en-US");
}

function formatCurrencyVnd(value) {
  return `\u20ab${formatInteger(value)}`;
}

function formatCompactNumber(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    const scaled = abs / 1_000_000_000;
    const digits = scaled >= 10 ? 0 : 1;
    return `${n < 0 ? "-" : ""}${scaled.toFixed(digits).replace(/\.0$/, "")}B`;
  }

  if (abs >= 1_000_000) {
    const scaled = abs / 1_000_000;
    const digits = scaled >= 10 ? 0 : 1;
    return `${n < 0 ? "-" : ""}${scaled.toFixed(digits).replace(/\.0$/, "")}M`;
  }

  if (abs >= 1_000) {
    return `${n < 0 ? "-" : ""}${Math.round(abs).toLocaleString("en-US")}`;
  }

  return `${Math.round(n)}`;
}

function formatCompactCurrencyVnd(value) {
  return `\u20ab${formatCompactNumber(value)}`;
}

function formatPercent(changePercent) {
  if (changePercent === null || changePercent === undefined || !Number.isFinite(Number(changePercent))) {
    return null;
  }

  const value = round1(changePercent);
  const abs = Math.abs(value);
  const digits = Number.isInteger(abs) ? 0 : 1;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${abs.toFixed(digits)}%`;
}

function changeMeta(changePercent) {
  const value = changePercent === null || changePercent === undefined ? null : round1(changePercent);

  if (value === null || !Number.isFinite(value)) {
    return {
      value: null,
      display: null,
      trend: "flat",
      tone: "neutral",
    };
  }

  if (value > 0) {
    return {
      value,
      display: formatPercent(value),
      trend: "up",
      tone: "success",
    };
  }

  if (value < 0) {
    return {
      value,
      display: formatPercent(value),
      trend: "down",
      tone: "danger",
    };
  }

  return {
    value: 0,
    display: "0%",
    trend: "flat",
    tone: "neutral",
  };
}

function titleCaseWords(value) {
  return String(value || "")
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeRole(roleCode, roleName) {
  const code = typeof roleCode === "string" ? roleCode.trim().toLowerCase() : null;
  const map = {
    admin: { label: "Administrator", tone: "primary" },
    premium_user: { label: "Premium", tone: "warning" },
    creator: { label: "Creator", tone: "info" },
    user: { label: "Learner", tone: "neutral" },
  };

  if (code && map[code]) {
    return { code, label: map[code].label, tone: map[code].tone };
  }

  if (roleName) {
    return { code, label: roleName, tone: "neutral" };
  }

  return {
    code,
    label: code ? titleCaseWords(code) : "User",
    tone: "neutral",
  };
}

function mapUserStatus(user) {
  if (user.is_active && user.email_verified) {
    return { code: "active", label: "Ho\u1ea1t \u0111\u1ed9ng", tone: "success" };
  }

  if (user.is_active && !user.email_verified) {
    return { code: "pending", label: "Ch\u1edd x\u00e1c minh", tone: "warning" };
  }

  return { code: "inactive", label: "B\u1ecb kh\u00f3a", tone: "danger" };
}

function mapOrderStatus(paymentStatus) {
  const code = typeof paymentStatus === "string" ? paymentStatus.trim().toLowerCase() : "pending";
  const map = {
    completed: { label: "Ho\u00e0n th\u00e0nh", tone: "success" },
    processing: { label: "\u0110ang x\u1eed l\u00fd", tone: "warning" },
    pending: { label: "Ch\u1edd thanh to\u00e1n", tone: "neutral" },
    failed: { label: "Th\u1ea5t b\u1ea1i", tone: "danger" },
    cancelled: { label: "\u0110\u00e3 h\u1ee7y", tone: "danger" },
    refunded: { label: "Ho\u00e0n ti\u1ec1n", tone: "info" },
  };

  return {
    code,
    label: map[code]?.label || titleCaseWords(code),
    tone: map[code]?.tone || "neutral",
  };
}

function formatRelativeTimeVi(dateInput) {
  if (!dateInput) return null;

  const ts = new Date(dateInput).getTime();
  if (Number.isNaN(ts)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));

  if (seconds < 60) return "V\u1eeba xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ph\u00fat tr\u01b0\u1edbc`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} gi\u1edd tr\u01b0\u1edbc`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} ng\u00e0y tr\u01b0\u1edbc`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} th\u00e1ng tr\u01b0\u1edbc`;
  return `${Math.floor(seconds / 31536000)} n\u0103m tr\u01b0\u1edbc`;
}

function buildMetricCard({ key, title, iconKey, value, changePercent, formatter }) {
  const change = changeMeta(changePercent);
  const displayValue = formatter === "compactCurrency" ? formatCompactCurrencyVnd(value) : formatInteger(value);

  return {
    key,
    title,
    iconKey,
    value,
    displayValue,
    changePercent: change.value,
    changeDisplay: change.display,
    trend: change.trend,
    tone: change.tone,
  };
}

function mergeMonthlyRevenue(buckets, rows) {
  const key = (year, month) => `${year}-${month}`;
  const map = new Map();

  for (const bucket of buckets) {
    map.set(key(bucket.year, bucket.month), bucket);
  }

  for (const row of rows) {
    const bucket = map.get(key(row.year, row.month));
    if (bucket) bucket.amount = Number(row.total) || 0;
  }

  return buckets.map((bucket, index) => ({
    year: bucket.year,
    month: bucket.month,
    label: `T${index + 1}`,
    amount: Math.round(bucket.amount),
    amountMillions: round1(bucket.amount / 1_000_000),
    displayAmount: formatCompactCurrencyVnd(bucket.amount),
  }));
}

async function mapFeaturedWithGrowth(rows) {
  const now = new Date();
  const end = now;
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const end30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return Promise.all(
    rows.map(async (row) => {
      const [sum30, sumPrev30] = await Promise.all([
        dashboardRepository.sumPurchaseRevenueByCourse(row.courseId, start30, end),
        dashboardRepository.sumPurchaseRevenueByCourse(row.courseId, start60, end30),
      ]);

      const growth = changeMeta(pctChange(num(sum30), num(sumPrev30)));
      const rating = row.course?.rating_average != null ? num(row.course.rating_average) : null;
      const revenue = Math.round(num(row.revenue));
      const studentCount = row.studentCount || 0;

      return {
        rank: row.rank,
        courseId: row.courseId,
        courseName: row.course?.course_name || null,
        courseCode: row.course?.course_code || null,
        studentCount,
        studentCountDisplay: `${formatInteger(studentCount)} h\u1ecdc vi\u00ean`,
        rating,
        ratingDisplay: rating == null ? null : rating.toFixed(1),
        ratingCount: row.course?.rating_count ?? 0,
        revenue,
        revenueDisplay: formatCompactCurrencyVnd(revenue),
        growthPercent: growth.value,
        growthDisplay: growth.display,
        growthTrend: growth.trend,
        growthTone: growth.tone,
      };
    })
  );
}

function mapRecentUser(user) {
  const primaryRole = user.mst_user_roles?.[0]?.mst_roles;
  const role = normalizeRole(primaryRole?.role_code, primaryRole?.role_name);
  const status = mapUserStatus(user);

  return {
    userId: user.user_id,
    email: user.email,
    fullName: user.full_name || user.display_name || user.email,
    avatarUrl: user.avatar_url,
    roleCode: role.code,
    roleLabel: role.label,
    roleTone: role.tone,
    statusCode: status.code,
    statusLabel: status.label,
    statusTone: status.tone,
    emailVerified: Boolean(user.email_verified),
    joinedAtUtc: user.created_at_utc,
    joinedRelative: formatRelativeTimeVi(user.created_at_utc),
  };
}

function resolveCustomerName(order) {
  return (
    order.customer_name ||
    order.mst_users?.full_name ||
    order.mst_users?.display_name ||
    order.customer_email ||
    order.mst_users?.email ||
    null
  );
}

function mapRecentOrder(order) {
  const firstItem = order.pmt_order_items?.[0];
  const status = mapOrderStatus(order.payment_status);
  const amount = Number(order.total_amount) || 0;
  const customerName = resolveCustomerName(order);

  return {
    orderId: order.order_id,
    orderCode: order.order_code,
    displayCode: order.order_code ? `#${order.order_code}` : `#${order.order_id.slice(0, 8)}`,
    customerName,
    customerEmail: order.customer_email || order.mst_users?.email || null,
    customerAvatarUrl: order.mst_users?.avatar_url || null,
    courseOrItemName: firstItem?.item_name || null,
    itemType: firstItem?.item_type || null,
    amount,
    amountDisplay: formatCurrencyVnd(amount),
    currencyCode: order.currency_code || "VND",
    paymentStatus: status.code,
    paymentStatusLabel: status.label,
    paymentStatusTone: status.tone,
    createdAtUtc: order.created_at_utc,
    paidAtUtc: order.paid_at_utc,
    createdRelative: formatRelativeTimeVi(order.created_at_utc),
  };
}

function buildUiPayload(period, summaryCards, revenueByMonth, featuredCourses, recentUsers, recentOrders) {
  return {
    page: {
      sectionTitle: "Dashboard",
      sectionSubtitle: "T\u1ed5ng quan ho\u1ea1t \u0111\u1ed9ng h\u1ec7 th\u1ed1ng SKR",
    },
    filters: {
      activePeriod: period,
      options: PERIOD_OPTIONS.map((option) => ({
        ...option,
        isActive: option.value === period,
      })),
    },
    summaryCards,
    revenueChart: {
      title: "Bi\u1ec3u \u0111\u1ed3 Doanh thu",
      subtitle: "T\u1ed5ng doanh thu 12 th\u00e1ng qua",
      legendLabel: "Doanh thu (tri\u1ec7u \u0111)",
      points: revenueByMonth,
    },
    featuredCourses: {
      title: "Kh\u00f3a h\u1ecdc N\u1ed5i b\u1eadt",
      actionLabel: "Xem t\u1ea5t c\u1ea3",
      items: featuredCourses,
    },
    recentUsers: {
      title: "Ng\u01b0\u1eddi d\u00f9ng M\u1edbi",
      actionLabel: "Xem t\u1ea5t c\u1ea3",
      columns: [
        { key: "user", label: "Ng\u01b0\u1eddi d\u00f9ng" },
        { key: "role", label: "Vai tr\u00f2" },
        { key: "status", label: "Tr\u1ea1ng th\u00e1i" },
        { key: "joined", label: "Tham gia" },
      ],
      items: recentUsers,
    },
    recentOrders: {
      title: "\u0110\u01a1n h\u00e0ng G\u1ea7n \u0111\u00e2y",
      actionLabel: "Xem t\u1ea5t c\u1ea3",
      columns: [
        { key: "order", label: "M\u00e3 \u0111\u01a1n" },
        { key: "course", label: "Kh\u00f3a h\u1ecdc" },
        { key: "amount", label: "S\u1ed1 ti\u1ec1n" },
        { key: "status", label: "Tr\u1ea1ng th\u00e1i" },
      ],
      items: recentOrders,
    },
  };
}

const dashboardService = {
  async getDashboard(period = "month") {
    const currentPeriod = period === "week" || period === "year" ? period : "month";
    const { currentStart, currentEnd, previousStart, previousEnd } = getComparableRanges(currentPeriod);

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
      recentUsersRaw,
      recentOrdersRaw,
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

    const revenueCurrent = Math.round(num(revenueCurr));
    const revenueChange = pctChange(num(revenueCurr), num(revenuePrev));
    const usersChange = pctChange(newUsersCurr, newUsersPrev);
    const coursesChange = pctChange(newCoursesCurr, newCoursesPrev);
    const ordersChange = pctChange(ordersCurr, ordersPrev);

    const usersSummary = {
      title: "T\u1ed5ng ng\u01b0\u1eddi d\u00f9ng",
      iconKey: "users",
      total: totalUsersAll,
      displayTotal: formatInteger(totalUsersAll),
      newInPeriod: newUsersCurr,
      changePercent: usersChange,
      changeDisplay: formatPercent(usersChange),
      trend: changeMeta(usersChange).trend,
      tone: changeMeta(usersChange).tone,
    };

    const coursesSummary = {
      title: "Kh\u00f3a h\u1ecdc",
      iconKey: "course",
      total: totalCoursesAll,
      displayTotal: formatInteger(totalCoursesAll),
      newInPeriod: newCoursesCurr,
      changePercent: coursesChange,
      changeDisplay: formatPercent(coursesChange),
      trend: changeMeta(coursesChange).trend,
      tone: changeMeta(coursesChange).tone,
    };

    const ordersSummary = {
      title: "\u0110\u01a1n h\u00e0ng",
      iconKey: "order",
      total: totalOrdersAll,
      displayTotal: formatInteger(totalOrdersAll),
      countInPeriod: ordersCurr,
      changePercent: ordersChange,
      changeDisplay: formatPercent(ordersChange),
      trend: changeMeta(ordersChange).trend,
      tone: changeMeta(ordersChange).tone,
    };

    const revenueSummary = {
      title: "Doanh thu",
      iconKey: "revenue",
      currencyCode: "VND",
      totalInPeriod: revenueCurrent,
      displayTotalInPeriod: formatCompactCurrencyVnd(revenueCurrent),
      changePercent: revenueChange,
      changeDisplay: formatPercent(revenueChange),
      trend: changeMeta(revenueChange).trend,
      tone: changeMeta(revenueChange).tone,
    };

    const summaryCards = [
      buildMetricCard({
        key: "users",
        title: usersSummary.title,
        iconKey: usersSummary.iconKey,
        value: usersSummary.total,
        changePercent: usersSummary.changePercent,
      }),
      buildMetricCard({
        key: "courses",
        title: coursesSummary.title,
        iconKey: coursesSummary.iconKey,
        value: coursesSummary.total,
        changePercent: coursesSummary.changePercent,
      }),
      buildMetricCard({
        key: "orders",
        title: ordersSummary.title,
        iconKey: ordersSummary.iconKey,
        value: ordersSummary.total,
        changePercent: ordersSummary.changePercent,
      }),
      buildMetricCard({
        key: "revenue",
        title: revenueSummary.title,
        iconKey: revenueSummary.iconKey,
        value: revenueSummary.totalInPeriod,
        changePercent: revenueSummary.changePercent,
        formatter: "compactCurrency",
      }),
    ];

    const buckets = buildLast12MonthBuckets();
    const revenueByMonth = mergeMonthlyRevenue(buckets, monthlyRows);
    const featuredCourses = await mapFeaturedWithGrowth(topRaw);
    const recentUsers = recentUsersRaw.map(mapRecentUser);
    const recentOrders = recentOrdersRaw.map(mapRecentOrder);

    return {
      period: currentPeriod,
      periodBounds: {
        currentStartUtc: currentStart,
        currentEndUtc: currentEnd,
        previousStartUtc: previousStart,
        previousEndUtc: previousEnd,
      },
      summary: {
        users: usersSummary,
        courses: coursesSummary,
        orders: ordersSummary,
        revenue: revenueSummary,
      },
      revenueByMonth,
      featuredCourses,
      recentUsers,
      recentOrders,
      ui: buildUiPayload(currentPeriod, summaryCards, revenueByMonth, featuredCourses, recentUsers, recentOrders),
    };
  },
};

module.exports = dashboardService;

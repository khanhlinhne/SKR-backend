const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const expertRepository = require("../repositories/expert.repository");
const dashboardRepository = require("../repositories/dashboard.repository");
const expertDto = require("../dtos/expert.dto");

async function userIsAdmin(userId) {
  if (!userId) return false;
  const roles = await prisma.mst_user_roles.findMany({
    where: {
      user_id: userId,
      is_active: true,
      OR: [{ expires_at_utc: null }, { expires_at_utc: { gt: new Date() } }],
    },
    include: { mst_roles: true },
  });
  return roles.some((ur) => ur.mst_roles?.is_active && ur.mst_roles?.role_code === "admin");
}

async function ensureCreatorRole(userId, staffUserId) {
  const creatorRole = await prisma.mst_roles.findFirst({
    where: { role_code: "creator", is_active: true },
  });
  if (!creatorRole) return;

  const existing = await prisma.mst_user_roles.findFirst({
    where: {
      user_id: userId,
      role_id: creatorRole.role_id,
      is_active: true,
    },
  });
  if (existing) return;

  await prisma.mst_user_roles.create({
    data: {
      user_id: userId,
      role_id: creatorRole.role_id,
      created_by: staffUserId,
      is_active: true,
    },
  });
}

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
      total: 0,
    });
  }
  return buckets;
}

function mergeMonthlyStudentLogins(buckets, rows) {
  const key = (year, month) => `${year}-${month}`;
  const map = new Map();
  for (const b of buckets) map.set(key(b.year, b.month), b);

  for (const row of rows || []) {
    const bucket = map.get(key(row.year, row.month));
    if (bucket) bucket.total = Number(row.total) || 0;
  }

  return buckets.map((bucket, index) => ({
    year: bucket.year,
    month: bucket.month,
    label: `T${index + 1}`,
    total: bucket.total,
  }));
}

const expertService = {
  async getMyDashboard(userId, period = "month") {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const currentPeriod = period === "week" || period === "year" ? period : "month";
    const { currentStart, currentEnd, previousStart, previousEnd } = getComparableRanges(currentPeriod);
    const chartStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1)
    );

    const [
      totalCourses,
      totalStudents,
      revenueCurrent,
      revenuePrevious,
      ratingSummary,
      monthlyStudentLoginsRaw,
      topCoursesRaw,
    ] = await Promise.all([
      dashboardRepository.countCoursesByCreator(userId, { status: "published" }),
      dashboardRepository.countActiveStudentsByCreator(userId),
      dashboardRepository.sumPurchaseRevenueByCreator(userId, currentStart, currentEnd),
      dashboardRepository.sumPurchaseRevenueByCreator(userId, previousStart, previousEnd),
      dashboardRepository.getCourseRatingSummaryByCreator(userId),
      dashboardRepository.getMonthlyStudentLoginsByCreator(userId, chartStart, currentEnd),
      dashboardRepository.getTopCoursesByCreator(userId, 5),
    ]);

    const revenueChange = pctChange(num(revenueCurrent), num(revenuePrevious));
    const monthlyStudentLogins = mergeMonthlyStudentLogins(
      buildLast12MonthBuckets(),
      monthlyStudentLoginsRaw
    );

    const topCourses = topCoursesRaw.map((row) => ({
      rank: row.rank,
      courseId: row.courseId,
      courseName: row.course?.course_name || null,
      courseCode: row.course?.course_code || null,
      studentCount: row.studentCount || 0,
      revenue: Math.round(num(row.revenue)),
      rating: row.course?.rating_average != null ? round1(num(row.course.rating_average)) : null,
    }));

    return {
      period: currentPeriod,
      periodBounds: {
        currentStartUtc: currentStart,
        currentEndUtc: currentEnd,
        previousStartUtc: previousStart,
        previousEndUtc: previousEnd,
      },
      summary: {
        courses: {
          total: totalCourses,
        },
        students: {
          total: totalStudents,
        },
        revenue: {
          totalInPeriod: Math.round(num(revenueCurrent)),
          currencyCode: "VND",
          changePercent: revenueChange,
        },
        rating: {
          average: ratingSummary.average != null ? round1(num(ratingSummary.average)) : null,
          ratedCourseCount: ratingSummary.ratedCourseCount,
        },
      },
      studentLoginsByMonth: monthlyStudentLogins,
      topCourses,
      ui: {
        page: {
          sectionTitle: "Tổng quan",
          sectionSubtitle: "Theo dõi khóa học và người học của bạn",
        },
        summaryCards: [
          { key: "courses", title: "Khóa học", value: totalCourses },
          { key: "students", title: "Học viên", value: totalStudents },
          {
            key: "revenue",
            title: "Doanh thu",
            value: Math.round(num(revenueCurrent)),
            currencyCode: "VND",
            changePercent: revenueChange,
          },
          {
            key: "rating",
            title: "Đánh giá",
            value: ratingSummary.average != null ? round1(num(ratingSummary.average)) : null,
          },
        ],
        studentLoginChart: {
          title: "Biểu đồ Học viên đăng nhập",
          subtitle: "Số học viên đăng nhập theo tháng",
          legendLabel: "Học viên đăng nhập",
          points: monthlyStudentLogins,
        },
        myCourses: {
          title: "Khóa học của tôi",
          items: topCourses,
        },
      },
    };
  },

  async listExperts(query, { isAdmin = false } = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const includeInactive = isAdmin && query.includeInactive === "true";

    const where = {};
    if (!includeInactive) {
      where.is_active = true;
      where.status = "active";
    }

    if (query.search) {
      where.OR = [
        { headline: { contains: query.search, mode: "insensitive" } },
        { expertise_summary: { contains: query.search, mode: "insensitive" } },
        { mst_users: { full_name: { contains: query.search, mode: "insensitive" } } },
        { mst_users: { display_name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const { items, totalItems } = await expertRepository.findMany({
      where,
      orderBy: [{ display_order: "asc" }, { created_at_utc: "desc" }],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: items.map(expertDto.toListItem),
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

  async getExpertDetail(expertId, { isAdmin = false } = {}) {
    const row = await expertRepository.findById(expertId);
    if (!row) throw AppError.notFound("Expert not found");
    if (!isAdmin && (!row.is_active || row.status !== "active")) {
      throw AppError.notFound("Expert not found");
    }
    return expertDto.toDetail(row);
  },

  async createExpert(body, staffUserId) {
    if (!staffUserId) throw AppError.unauthorized("Authentication required.");

    const user = await prisma.mst_users.findUnique({
      where: { user_id: body.userId },
    });
    if (!user || !user.is_active) throw AppError.notFound("User not found or inactive");

    const dup = await expertRepository.findByUserId(body.userId);
    if (dup) throw AppError.conflict("This user already has an expert profile");

    if (body.subjectCourseIds?.length) {
      const count = await prisma.mst_courses.count({
        where: { course_id: { in: body.subjectCourseIds }, is_active: true },
      });
      if (count !== body.subjectCourseIds.length) {
        throw AppError.badRequest("One or more subjectCourseIds are invalid");
      }
    }

    if (body.assignCreatorRole !== false) {
      await ensureCreatorRole(body.userId, staffUserId);
    }

    const created = await expertRepository.create({
      userId: body.userId,
      headline: body.headline,
      expertiseSummary: body.expertiseSummary,
      subjectCourseIds: body.subjectCourseIds ?? null,
      displayOrder: body.displayOrder,
      status: "active",
      createdBy: staffUserId,
    });

    return expertDto.toDetail(created);
  },

  async updateExpert(expertId, body, staffUserId) {
    if (!staffUserId) throw AppError.unauthorized("Authentication required.");

    const existing = await expertRepository.findById(expertId);
    if (!existing) throw AppError.notFound("Expert not found");

    if (body.subjectCourseIds?.length) {
      const count = await prisma.mst_courses.count({
        where: { course_id: { in: body.subjectCourseIds }, is_active: true },
      });
      if (count !== body.subjectCourseIds.length) {
        throw AppError.badRequest("One or more subjectCourseIds are invalid");
      }
    }

    const updated = await expertRepository.update(expertId, {
      headline: body.headline,
      expertiseSummary: body.expertiseSummary,
      subjectCourseIds: body.subjectCourseIds,
      displayOrder: body.displayOrder,
      status: body.status,
      updatedBy: staffUserId,
    });

    return expertDto.toDetail(updated);
  },

  async deleteExpert(expertId, staffUserId) {
    if (!staffUserId) throw AppError.unauthorized("Authentication required.");

    const existing = await expertRepository.findById(expertId);
    if (!existing) throw AppError.notFound("Expert not found");

    await expertRepository.update(expertId, {
      isActive: false,
      status: "inactive",
      updatedBy: staffUserId,
    });

    return { deleted: true, expertId };
  },
};

module.exports = { expertService, userIsAdmin };

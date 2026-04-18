const prisma = require("../config/prisma");

const courseInclude = {
  mst_users: {
    select: {
      user_id: true,
      full_name: true,
      display_name: true,
      avatar_url: true,
      email: true,
    },
  },
  mst_chapters: {
    where: { is_active: true },
    orderBy: { display_order: "asc" },
    select: {
      chapter_id: true,
      chapter_name: true,
      display_order: true,
      mst_lessons: {
        where: { is_active: true },
        orderBy: { display_order: "asc" },
        select: {
          lesson_id: true,
          lesson_name: true,
          display_order: true,
          chapter_id: true,
        },
      },
    },
  },
};

const enrollmentSelect = {
  purchase_id: true,
  course_id: true,
  user_id: true,
  order_id: true,
  purchased_at_utc: true,
  purchase_price: true,
  currency_code: true,
  access_start_utc: true,
  access_end_utc: true,
  is_lifetime_access: true,
  progress_percent: true,
  chapters_completed: true,
  lessons_completed: true,
  last_accessed_at_utc: true,
  completed_at_utc: true,
  certificate_issued: true,
  certificate_issued_at_utc: true,
  user_rating: true,
  rated_at_utc: true,
  status: true,
  mst_users: {
    select: {
      user_id: true,
      full_name: true,
      display_name: true,
      email: true,
      phone_number: true,
      avatar_url: true,
    },
  },
  pmt_orders: {
    select: {
      payment_status: true,
      total_amount: true,
      currency_code: true,
      paid_at_utc: true,
      cancelled_at_utc: true,
      refunded_at_utc: true,
    },
  },
};

const analyticsRepository = {
  async findOwnedCourse(courseId, ownerUserId, { isAdmin = false } = {}) {
    return prisma.mst_courses.findFirst({
      where: {
        course_id: courseId,
        ...(isAdmin ? {} : { creator_id: ownerUserId }),
        is_active: true,
      },
      include: courseInclude,
    });
  },

  async findEnrollmentsByCourse(courseId) {
    return prisma.pmt_course_purchases.findMany({
      where: { course_id: courseId },
      orderBy: [{ purchased_at_utc: "desc" }, { created_at_utc: "desc" }],
      select: enrollmentSelect,
    });
  },

  async findLessonProgressByCourse(courseId) {
    return prisma.lrn_course_lesson_progress.findMany({
      where: {
        course_id: courseId,
        status: "active",
      },
      select: {
        progress_id: true,
        purchase_id: true,
        user_id: true,
        lesson_id: true,
        chapter_id: true,
        completed: true,
        completed_at_utc: true,
        created_at_utc: true,
        updated_at_utc: true,
      },
    });
  },

  async findVideoProgressByCourse(courseId) {
    return prisma.$queryRaw`
      SELECT
        vp.progress_id AS "progressId",
        vp.user_id AS "userId",
        vp.video_id AS "videoId",
        vp.watch_duration_seconds AS "watchDurationSeconds",
        vp.last_watched_at_utc AS "lastWatchedAtUtc",
        vp.created_at_utc AS "createdAtUtc",
        vp.updated_at_utc AS "updatedAtUtc",
        v.lesson_id AS "lessonId"
      FROM lrn_video_progress vp
      INNER JOIN cnt_videos v
        ON v.video_id = vp.video_id
      WHERE v.subject_id = ${courseId}::uuid
    `;
  },
};

module.exports = analyticsRepository;

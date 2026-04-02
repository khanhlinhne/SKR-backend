const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const enrollmentRepository = {
  /**
   * Find all active course purchases for a given user,
   * including the related course and its creator info.
   */
  async findByUser(userId, { where = {}, skip = 0, take = 50, orderBy } = {}) {
    const filter = {
      user_id: userId,
      status: "active",
      ...where,
    };

    const [items, totalItems] = await Promise.all([
      prisma.pmt_course_purchases.findMany({
        where: filter,
        skip,
        take,
        orderBy: orderBy || { purchased_at_utc: "desc" },
        include: {
          mst_courses: {
            include: {
              mst_users: {
                select: {
                  user_id: true,
                  full_name: true,
                  display_name: true,
                  avatar_url: true,
                },
              },
              mst_chapters: {
                select: { chapter_id: true },
                where: { is_active: true },
              },
            },
          },
        },
      }),
      prisma.pmt_course_purchases.count({ where: filter }),
    ]);

    return { items, totalItems };
  },

  async findByUserAndCourse(userId, courseId) {
    return prisma.pmt_course_purchases.findUnique({
      where: {
        course_id_user_id: {
          course_id: courseId,
          user_id: userId,
        },
      },
      include: {
        mst_courses: {
          include: {
            mst_users: {
              select: {
                user_id: true,
                full_name: true,
                display_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });
  },

  async getStats(userId) {
    const purchases = await prisma.pmt_course_purchases.findMany({
      where: { user_id: userId, status: "active" },
      select: {
        progress_percent: true,
        lessons_completed: true,
        mst_courses: {
          select: {
            estimated_duration_hours: true,
            total_lessons: true,
          },
        },
      },
    });

    const totalCourses = purchases.length;
    const completed = purchases.filter(
      (p) => Number(p.progress_percent || 0) >= 100
    ).length;
    const inProgress = purchases.filter(
      (p) =>
        Number(p.progress_percent || 0) > 0 &&
        Number(p.progress_percent || 0) < 100
    ).length;
    const totalHours = purchases.reduce(
      (sum, p) => sum + (p.mst_courses?.estimated_duration_hours || 0),
      0
    );
    const totalLessonsCompleted = purchases.reduce(
      (sum, p) => sum + (p.lessons_completed || 0),
      0
    );

    return {
      totalCourses,
      completed,
      inProgress,
      totalHours,
      totalLessonsCompleted,
    };
  },
};

module.exports = enrollmentRepository;

const prisma = require("../config/prisma");

const courseProgressRepository = {
  async findPurchaseByUserAndCourse(userId, courseId) {
    return prisma.pmt_course_purchases.findUnique({
      where: {
        course_id_user_id: {
          course_id: courseId,
          user_id: userId,
        },
      },
      select: {
        purchase_id: true,
        course_id: true,
        user_id: true,
        status: true,
        created_at_utc: true,
        updated_at_utc: true,
      },
    });
  },

  async findLessonContext(lessonId) {
    return prisma.mst_lessons.findUnique({
      where: { lesson_id: lessonId },
      select: {
        lesson_id: true,
        chapter_id: true,
        is_active: true,
        mst_chapters: {
          select: {
            chapter_id: true,
            course_id: true,
            is_active: true,
          },
        },
      },
    });
  },

  async findActiveCourseStructure(courseId) {
    return prisma.mst_chapters.findMany({
      where: {
        course_id: courseId,
        is_active: true,
      },
      orderBy: {
        display_order: "asc",
      },
      select: {
        chapter_id: true,
        mst_lessons: {
          where: {
            is_active: true,
          },
          orderBy: {
            display_order: "asc",
          },
          select: {
            lesson_id: true,
          },
        },
      },
    });
  },

  async findLessonProgressRows(purchaseId) {
    return prisma.lrn_course_lesson_progress.findMany({
      where: {
        purchase_id: purchaseId,
        status: "active",
      },
      select: {
        lesson_id: true,
        chapter_id: true,
        completed: true,
        completed_at_utc: true,
        created_at_utc: true,
        updated_at_utc: true,
      },
    });
  },

  async saveLessonProgressAndPurchaseSnapshot({
    purchaseId,
    courseId,
    userId,
    chapterId,
    lessonId,
    completed,
    completedLessons,
    chaptersCompleted,
    progressPercent,
    totalLessons,
    completedAtUtc,
    updatedAt,
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.lrn_course_lesson_progress.findUnique({
        where: {
          purchase_id_lesson_id: {
            purchase_id: purchaseId,
            lesson_id: lessonId,
          },
        },
        select: {
          progress_id: true,
          completed_at_utc: true,
          created_at_utc: true,
        },
      });

      if (existing) {
        await tx.lrn_course_lesson_progress.update({
          where: {
            progress_id: existing.progress_id,
          },
          data: {
            chapter_id: chapterId ?? null,
            completed,
            completed_at_utc: completed ? existing.completed_at_utc || updatedAt : null,
            updated_by: userId,
            updated_at_utc: updatedAt,
            status: "active",
          },
        });
      } else {
        await tx.lrn_course_lesson_progress.create({
          data: {
            purchase_id: purchaseId,
            course_id: courseId,
            user_id: userId,
            chapter_id: chapterId ?? null,
            lesson_id: lessonId,
            completed,
            completed_at_utc: completed ? updatedAt : null,
            created_by: userId,
            status: "active",
          },
        });
      }

      await tx.pmt_course_purchases.update({
        where: {
          purchase_id: purchaseId,
        },
        data: {
          progress_percent: progressPercent,
          lessons_completed: completedLessons,
          chapters_completed: chaptersCompleted,
          completed_at_utc: completedAtUtc,
          last_accessed_at_utc: updatedAt,
          updated_by: userId,
          updated_at_utc: updatedAt,
        },
      });

      return {
        purchaseId,
        totalLessons,
      };
    });
  },
};

module.exports = courseProgressRepository;

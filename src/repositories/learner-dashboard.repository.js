const prisma = require("../config/prisma");
const { isMissingTableError } = require("../utils/prisma.util");

const ACTIVE_PURCHASE_SELECT = {
  purchase_id: true,
  course_id: true,
  progress_percent: true,
  lessons_completed: true,
  chapters_completed: true,
  purchased_at_utc: true,
  last_accessed_at_utc: true,
  completed_at_utc: true,
  status: true,
  mst_courses: {
    select: {
      course_id: true,
      course_name: true,
      category: true,
      course_icon_url: true,
      course_banner_url: true,
      total_lessons: true,
      total_chapters: true,
      total_questions: true,
      estimated_duration_hours: true,
    },
  },
};

const learnerDashboardRepository = {
  async findUserProfile(userId) {
    return prisma.mst_users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        full_name: true,
        display_name: true,
        email: true,
        avatar_url: true,
        timezone_offset: true,
      },
    });
  },

  async findLearningStreak(userId) {
    try {
      return await prisma.lrn_learning_streaks.findUnique({
        where: { user_id: userId },
        select: {
          current_streak_days: true,
          longest_streak_days: true,
          last_activity_date: true,
          total_study_days: true,
          total_study_hours: true,
        },
      });
    } catch (error) {
      if (isMissingTableError(error, "lrn_learning_streaks")) {
        return null;
      }
      throw error;
    }
  },

  async findStudySessionsByDateRange(userId, startDate, endDate) {
    try {
      return await prisma.lrn_study_sessions.findMany({
        where: {
          user_id: userId,
          session_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { session_date: "asc" },
        select: {
          session_date: true,
          study_duration_minutes: true,
          average_accuracy: true,
        },
      });
    } catch (error) {
      if (isMissingTableError(error, "lrn_study_sessions")) {
        return [];
      }
      throw error;
    }
  },

  async findFlashcardSessionsByRange(userId, startUtc, endUtc) {
    return prisma.lrn_flashcard_sessions.findMany({
      where: {
        user_id: userId,
        started_at_utc: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      orderBy: { started_at_utc: "asc" },
      select: {
        session_id: true,
        started_at_utc: true,
        ended_at_utc: true,
        session_duration_seconds: true,
        cards_reviewed: true,
      },
    });
  },

  async findQuizAttemptsByRange(userId, startUtc, endUtc) {
    return prisma.lrn_quiz_attempts.findMany({
      where: {
        user_id: userId,
        started_at_utc: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      orderBy: { started_at_utc: "asc" },
      select: {
        attempt_id: true,
        quiz_title: true,
        percentage_score: true,
        status: true,
        started_at_utc: true,
        submitted_at_utc: true,
      },
    });
  },

  async countFlashcardReviews(userId) {
    return prisma.lrn_flashcard_reviews.count({
      where: {
        user_id: userId,
        status: { not: "deleted" },
      },
    });
  },

  async countCompletedQuizAttempts(userId) {
    return prisma.lrn_quiz_attempts.count({
      where: {
        user_id: userId,
        status: { in: ["submitted", "graded"] },
      },
    });
  },

  async findActivePurchases(userId, take = 10) {
    return prisma.pmt_course_purchases.findMany({
      where: {
        user_id: userId,
        status: "active",
      },
      take,
      orderBy: [
        { last_accessed_at_utc: "desc" },
        { purchased_at_utc: "desc" },
        { completed_at_utc: "desc" },
      ],
      select: ACTIVE_PURCHASE_SELECT,
    });
  },

  async findRecentCoursePurchase(userId) {
    return prisma.pmt_course_purchases.findFirst({
      where: {
        user_id: userId,
        status: "active",
      },
      orderBy: [
        { last_accessed_at_utc: "desc" },
        { purchased_at_utc: "desc" },
      ],
      select: ACTIVE_PURCHASE_SELECT,
    });
  },

  async findCourseFlashcardSets(courseIds) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) return [];

    return prisma.cnt_flashcards.findMany({
      where: {
        course_id: { in: courseIds },
        status: { notIn: ["deleted", "archived"] },
      },
      select: {
        course_id: true,
        total_cards: true,
      },
    });
  },

  async findCourseQuestionLessons(courseIds) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) return [];

    return prisma.cnt_questions.findMany({
      where: {
        course_id: { in: courseIds },
        status: { not: "deleted" },
      },
      select: {
        course_id: true,
        lesson_id: true,
        question_id: true,
      },
    });
  },

  async findLatestFlashcardReviews(userId) {
    return prisma.lrn_flashcard_reviews.findMany({
      where: {
        user_id: userId,
        next_review_at_utc: { not: null },
        status: { not: "deleted" },
      },
      orderBy: [{ flashcard_item_id: "asc" }, { created_at_utc: "desc" }],
      distinct: ["flashcard_item_id"],
      select: {
        flashcard_item_id: true,
        next_review_at_utc: true,
        cnt_flashcard_items: {
          select: {
            flashcard_set_id: true,
            cnt_flashcards: {
              select: {
                flashcard_set_id: true,
                set_title: true,
                course_id: true,
                mst_courses: {
                  select: {
                    course_id: true,
                    course_name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findWeakQuizAnswersByCourse(userId, courseId) {
    if (!courseId) return [];

    return prisma.lrn_quiz_answers.findMany({
      where: {
        user_id: userId,
        is_correct: { not: null },
        cnt_questions: {
          is: {
            course_id: courseId,
          },
        },
      },
      orderBy: { answered_at_utc: "desc" },
      select: {
        is_correct: true,
        answered_at_utc: true,
        cnt_questions: {
          select: {
            question_id: true,
            mst_lessons: {
              select: {
                lesson_id: true,
                lesson_name: true,
              },
            },
          },
        },
      },
    });
  },
};

module.exports = learnerDashboardRepository;

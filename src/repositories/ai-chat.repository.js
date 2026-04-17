const prisma = require("../config/prisma");

const ACTIVE_PURCHASE_SELECT = {
  purchase_id: true,
  course_id: true,
  progress_percent: true,
  lessons_completed: true,
  chapters_completed: true,
  last_accessed_at_utc: true,
  purchased_at_utc: true,
  completed_at_utc: true,
  user_rating: true,
  mst_courses: {
    select: {
      course_id: true,
      course_name: true,
      category: true,
      total_lessons: true,
      total_chapters: true,
      estimated_duration_hours: true,
      rating_average: true,
      rating_count: true,
    },
  },
};

const COURSE_CATALOG_SELECT = {
  course_id: true,
  course_name: true,
  category: true,
  is_free: true,
  price_amount: true,
  original_price: true,
  currency_code: true,
  discount_percent: true,
  total_lessons: true,
  total_chapters: true,
  estimated_duration_hours: true,
  rating_average: true,
  rating_count: true,
  purchase_count: true,
  is_featured: true,
  published_at_utc: true,
  status: true,
};

const aiChatRepository = {
  async findUserProfile(userId) {
    return prisma.mst_users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        full_name: true,
        display_name: true,
        email: true,
        timezone_offset: true,
      },
    });
  },

  async findLearningStreak(userId) {
    return prisma.lrn_learning_streaks.findUnique({
      where: { user_id: userId },
      select: {
        current_streak_days: true,
        total_study_days: true,
        total_study_hours: true,
      },
    });
  },

  async findTodayStudySessions(userId, sessionDate) {
    return prisma.lrn_study_sessions.findMany({
      where: {
        user_id: userId,
        session_date: sessionDate,
      },
      orderBy: { session_start_utc: "asc" },
      select: {
        study_session_id: true,
        study_duration_minutes: true,
        activities_completed: true,
        quiz_attempts: true,
        flashcards_reviewed: true,
        videos_watched: true,
        documents_read: true,
        average_accuracy: true,
        session_start_utc: true,
        session_end_utc: true,
      },
    });
  },

  async findTodayFlashcardSessions(userId, startUtc, endUtc) {
    return prisma.lrn_flashcard_sessions.findMany({
      where: {
        user_id: userId,
        started_at_utc: {
          gte: startUtc,
          lt: endUtc,
        },
      },
      orderBy: { started_at_utc: "asc" },
      select: {
        session_id: true,
        total_cards: true,
        cards_reviewed: true,
        session_duration_seconds: true,
        started_at_utc: true,
        cnt_flashcards: {
          select: {
            flashcard_set_id: true,
            set_title: true,
            course_id: true,
            mst_courses: {
              select: {
                course_id: true,
                course_name: true,
              },
            },
          },
        },
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
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findActivePurchases(userId, take = 8) {
    return prisma.pmt_course_purchases.findMany({
      where: {
        user_id: userId,
        status: "active",
      },
      take,
      orderBy: [{ last_accessed_at_utc: "desc" }, { purchased_at_utc: "desc" }],
      select: ACTIVE_PURCHASE_SELECT,
    });
  },

  async findRecentQuizAttempts(userId, startUtc, take = 20) {
    return prisma.lrn_quiz_attempts.findMany({
      where: {
        user_id: userId,
        started_at_utc: {
          gte: startUtc,
        },
      },
      take,
      orderBy: { started_at_utc: "desc" },
      select: {
        attempt_id: true,
        quiz_title: true,
        percentage_score: true,
        total_questions: true,
        correct_answers: true,
        started_at_utc: true,
        submitted_at_utc: true,
        status: true,
      },
    });
  },

  async findTopRatedCourses(take = 5) {
    return prisma.mst_courses.findMany({
      where: {
        is_active: true,
        status: "published",
        rating_average: { not: null },
        rating_count: { gt: 0 },
      },
      take,
      orderBy: [{ rating_average: "desc" }, { rating_count: "desc" }],
      select: COURSE_CATALOG_SELECT,
    });
  },

  async findTopSystemCourses(take = 5) {
    return prisma.mst_courses.findMany({
      where: {
        is_active: true,
        status: "published",
      },
      take,
      orderBy: [
        { is_featured: "desc" },
        { purchase_count: "desc" },
        { rating_average: "desc" },
        { rating_count: "desc" },
      ],
      select: COURSE_CATALOG_SELECT,
    });
  },

  async findFreeCourses(take = 5) {
    return prisma.mst_courses.findMany({
      where: {
        is_active: true,
        status: "published",
        is_free: true,
      },
      take,
      orderBy: [
        { is_featured: "desc" },
        { rating_average: "desc" },
        { purchase_count: "desc" },
      ],
      select: COURSE_CATALOG_SELECT,
    });
  },

  async findRecommendedCourses(excludedCourseIds = [], categories = [], take = 5) {
    const categoryFilter = Array.isArray(categories)
      ? categories.filter((item) => typeof item === "string" && item.trim())
      : [];

    return prisma.mst_courses.findMany({
      where: {
        is_active: true,
        status: "published",
        course_id: {
          notIn: Array.isArray(excludedCourseIds) ? excludedCourseIds : [],
        },
        ...(categoryFilter.length
          ? {
              category: {
                in: categoryFilter,
              },
            }
          : {}),
      },
      take,
      orderBy: [
        { is_featured: "desc" },
        { rating_average: "desc" },
        { purchase_count: "desc" },
      ],
      select: COURSE_CATALOG_SELECT,
    });
  },
};

module.exports = aiChatRepository;

const prisma = require("../config/prisma");

const flashcardRepository = {
  /**
   * Full load: set + all active items + creator info.
   * Use only when you actually need the items (e.g. getItems, getSetById detail).
   */
  async findSetById(flashcardSetId) {
    return prisma.cnt_flashcards.findUnique({
      where: { flashcard_set_id: flashcardSetId },
      include: {
        cnt_flashcard_items: {
          where: { status: "active" },
          orderBy: { card_order: "asc" },
        },
        mst_users: {
          select: {
            user_id: true,
            full_name: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });
  },

  /**
   * Lightweight load: set metadata only (no items, no user join).
   * Use for permission checks, submit reviews, etc.
   */
  async findSetBasicById(flashcardSetId) {
    return prisma.cnt_flashcards.findUnique({
      where: { flashcard_set_id: flashcardSetId },
      select: {
        flashcard_set_id: true,
        creator_id: true,
        visibility: true,
        status: true,
        total_cards: true,
      },
    });
  },

  /**
   * Batch insert multiple reviews in a single transaction.
   */
  async createManyStudyReviews(reviewsData) {
    return prisma.$transaction(
      reviewsData.map((data) =>
        prisma.lrn_flashcard_reviews.create({
          data: {
            session_id: data.sessionId,
            user_id: data.userId,
            flashcard_item_id: data.flashcardItemId,
            user_rating: data.userRating,
            was_correct: data.wasCorrect,
            time_to_answer_seconds: data.timeToAnswerSeconds ?? 0,
            previous_ease_factor: data.previousEaseFactor,
            new_ease_factor: data.newEaseFactor,
            previous_interval_days: data.previousIntervalDays ?? 0,
            new_interval_days: data.newIntervalDays ?? 0,
            next_review_at_utc: data.nextReviewAtUtc,
            created_by: data.createdBy,
            status: data.status ?? "completed",
          },
        })
      )
    );
  },

  async findPublicSets({ courseId, search, orderBy, skip, take }) {
    const where = {
      visibility: "public",
      status: "active",
      ...(courseId ? { course_id: courseId } : {}),
      ...(search
        ? {
            OR: [
              { set_title: { contains: search, mode: "insensitive" } },
              { set_description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await prisma.$transaction([
      prisma.cnt_flashcards.findMany({
        where,
        orderBy: orderBy || [{ times_studied: "desc" }, { created_at_utc: "desc" }],
        skip,
        take,
        include: {
          _count: { select: { cnt_flashcard_items: true } },
          mst_users: {
            select: {
              user_id: true,
              full_name: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      }),
      prisma.cnt_flashcards.count({ where }),
    ]);

    return { items, totalItems };
  },

  async findSetsByCreator(creatorId, { where = {}, orderBy, skip, take }) {
    const baseWhere = { creator_id: creatorId, ...where };
    const [items, totalItems] = await prisma.$transaction([
      prisma.cnt_flashcards.findMany({
        where: baseWhere,
        orderBy: orderBy || { created_at_utc: "desc" },
        skip,
        take,
        include: {
          _count: { select: { cnt_flashcard_items: true } },
          mst_users: {
            select: {
              user_id: true,
              full_name: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      }),
      prisma.cnt_flashcards.count({ where: baseWhere }),
    ]);
    return { items, totalItems };
  },

  async findAccessibleSets(userId, { where = {}, orderBy, skip, take }) {
    const visibilityFilter = where.visibility;
    const statusFilter = where.status;

    const accessConditions = !visibilityFilter
      ? [
          { visibility: "public" },
          ...(userId ? [{ creator_id: userId }] : []),
        ]
      : visibilityFilter === "public"
        ? [{ visibility: "public" }]
        : userId
          ? [{ creator_id: userId, visibility: visibilityFilter }]
          : [];

    if (accessConditions.length === 0) {
      return { items: [], totalItems: 0 };
    }

    const baseWhere = {
      ...(statusFilter ? { status: statusFilter } : {}),
      OR: accessConditions,
    };

    const [items, totalItems] = await prisma.$transaction([
      prisma.cnt_flashcards.findMany({
        where: baseWhere,
        orderBy: orderBy || { created_at_utc: "desc" },
        skip,
        take,
        include: {
          _count: { select: { cnt_flashcard_items: true } },
          mst_users: {
            select: {
              user_id: true,
              full_name: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      }),
      prisma.cnt_flashcards.count({ where: baseWhere }),
    ]);

    return { items, totalItems };
  },

  async getUserSetProgressMap(userId, flashcardSetIds = []) {
    if (!userId || !Array.isArray(flashcardSetIds) || flashcardSetIds.length === 0) {
      return new Map();
    }

    try {
      const activeItems = await prisma.cnt_flashcard_items.findMany({
        where: {
          flashcard_set_id: { in: flashcardSetIds },
          OR: [{ status: "active" }, { status: null }],
        },
        select: {
          flashcard_item_id: true,
          flashcard_set_id: true,
        },
      });

      if (activeItems.length === 0) {
        return new Map();
      }

      const latestReviewByItem = new Map();
      const reviews = await prisma.lrn_flashcard_reviews.findMany({
        where: {
          user_id: userId,
          flashcard_item_id: { in: activeItems.map((item) => item.flashcard_item_id) },
        },
        orderBy: [
          { flashcard_item_id: "asc" },
          { created_at_utc: "desc" },
        ],
        select: {
          flashcard_item_id: true,
          was_correct: true,
          next_review_at_utc: true,
        },
      });

      for (const review of reviews) {
        if (!latestReviewByItem.has(review.flashcard_item_id)) {
          latestReviewByItem.set(review.flashcard_item_id, review);
        }
      }

      const now = new Date();
      const progressMap = new Map();

      for (const item of activeItems) {
        const currentProgress = progressMap.get(item.flashcard_set_id) || {
          masteredCount: 0,
          dueToday: 0,
        };
        const latestReview = latestReviewByItem.get(item.flashcard_item_id);

        if (latestReview?.was_correct === true) {
          currentProgress.masteredCount += 1;
        }

        if (!latestReview || (latestReview.next_review_at_utc && latestReview.next_review_at_utc <= now)) {
          currentProgress.dueToday += 1;
        }

        progressMap.set(item.flashcard_set_id, currentProgress);
      }

      return progressMap;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[FLASHCARD_PROGRESS] Failed to calculate set progress", error);
      }
      return new Map();
    }
  },

  async createSet(data) {
    const lessonId = data.lessonId && String(data.lessonId).trim() ? data.lessonId : null;
    const courseId = data.courseId && String(data.courseId).trim() ? data.courseId : null;
    return prisma.cnt_flashcards.create({
      data: {
        set_title: data.setTitle,
        set_description: data.setDescription ?? null,
        set_cover_image_url: data.setCoverImageUrl ?? null,
        creator_id: data.creatorId,
        lesson_id: lessonId,
        course_id: courseId,
        visibility: data.visibility ?? "private",
        tags: data.tags ?? null,
        total_cards: 0,
        created_by: data.createdBy,
        status: data.status ?? "draft",
      },
    });
  },

  async updateSet(flashcardSetId, data) {
    const lessonId = data.lessonId !== undefined
      ? (data.lessonId && String(data.lessonId).trim() ? data.lessonId : null)
      : undefined;
    const courseId = data.courseId !== undefined
      ? (data.courseId && String(data.courseId).trim() ? data.courseId : null)
      : undefined;
    return prisma.cnt_flashcards.update({
      where: { flashcard_set_id: flashcardSetId },
      data: {
        ...(data.setTitle != null && { set_title: data.setTitle }),
        ...(data.setDescription !== undefined && { set_description: data.setDescription }),
        ...(data.setCoverImageUrl !== undefined && { set_cover_image_url: data.setCoverImageUrl }),
        ...(lessonId !== undefined && { lesson_id: lessonId }),
        ...(courseId !== undefined && { course_id: courseId }),
        ...(data.visibility != null && { visibility: data.visibility }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.status != null && { status: data.status }),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async deleteSet(flashcardSetId) {
    return prisma.cnt_flashcards.delete({
      where: { flashcard_set_id: flashcardSetId },
    });
  },

  async findItemById(flashcardItemId) {
    return prisma.cnt_flashcard_items.findUnique({
      where: { flashcard_item_id: flashcardItemId },
      include: { cnt_flashcards: true },
    });
  },

  async createStudySession(data) {
    return prisma.lrn_flashcard_sessions.create({
      data: {
        user_id: data.userId,
        flashcard_set_id: data.flashcardSetId,
        total_cards: data.totalCards,
        cards_reviewed: 0,
        cards_mastered: 0,
        cards_learning: 0,
        cards_new: data.totalCards,
        created_by: data.createdBy,
        status: "started",
      },
    });
  },

  async findStudySessionById(sessionId) {
    return prisma.lrn_flashcard_sessions.findUnique({
      where: { session_id: sessionId },
    });
  },

  async findLatestReviewByUserAndItem(userId, flashcardItemId) {
    return prisma.lrn_flashcard_reviews.findFirst({
      where: {
        user_id: userId,
        flashcard_item_id: flashcardItemId,
      },
      orderBy: { created_at_utc: "desc" },
    });
  },

  async findSessionReviewByItem(sessionId, flashcardItemId) {
    return prisma.lrn_flashcard_reviews.findFirst({
      where: {
        session_id: sessionId,
        flashcard_item_id: flashcardItemId,
      },
      orderBy: { created_at_utc: "desc" },
    });
  },

  async createStudyReview(data) {
    return prisma.lrn_flashcard_reviews.create({
      data: {
        session_id: data.sessionId,
        user_id: data.userId,
        flashcard_item_id: data.flashcardItemId,
        user_rating: data.userRating,
        was_correct: data.wasCorrect,
        time_to_answer_seconds: data.timeToAnswerSeconds ?? 0,
        previous_ease_factor: data.previousEaseFactor,
        new_ease_factor: data.newEaseFactor,
        previous_interval_days: data.previousIntervalDays ?? 0,
        new_interval_days: data.newIntervalDays ?? 0,
        next_review_at_utc: data.nextReviewAtUtc,
        created_by: data.createdBy,
        status: data.status ?? "completed",
      },
    });
  },

  async updateStudyReview(reviewId, data) {
    return prisma.lrn_flashcard_reviews.update({
      where: { review_id: reviewId },
      data: {
        ...(data.userRating !== undefined && { user_rating: data.userRating }),
        ...(data.wasCorrect !== undefined && { was_correct: data.wasCorrect }),
        ...(data.timeToAnswerSeconds !== undefined && { time_to_answer_seconds: data.timeToAnswerSeconds }),
        ...(data.previousEaseFactor !== undefined && { previous_ease_factor: data.previousEaseFactor }),
        ...(data.newEaseFactor !== undefined && { new_ease_factor: data.newEaseFactor }),
        ...(data.previousIntervalDays !== undefined && { previous_interval_days: data.previousIntervalDays }),
        ...(data.newIntervalDays !== undefined && { new_interval_days: data.newIntervalDays }),
        ...(data.nextReviewAtUtc !== undefined && { next_review_at_utc: data.nextReviewAtUtc }),
        ...(data.status !== undefined && { status: data.status }),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async refreshStudySessionStats(sessionId, totalCards, updatedBy) {
    const [cardsReviewed, cardsMastered] = await prisma.$transaction([
      prisma.lrn_flashcard_reviews.count({
        where: { session_id: sessionId },
      }),
      prisma.lrn_flashcard_reviews.count({
        where: {
          session_id: sessionId,
          was_correct: true,
        },
      }),
    ]);

    const cardsLearning = Math.max(cardsReviewed - cardsMastered, 0);
    const cardsNew = Math.max((totalCards ?? 0) - cardsReviewed, 0);

    return prisma.lrn_flashcard_sessions.update({
      where: { session_id: sessionId },
      data: {
        cards_reviewed: cardsReviewed,
        cards_mastered: cardsMastered,
        cards_learning: cardsLearning,
        cards_new: cardsNew,
        updated_by: updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async completeStudySession(sessionId, data) {
    return prisma.lrn_flashcard_sessions.update({
      where: { session_id: sessionId },
      data: {
        ended_at_utc: data.endedAtUtc ?? new Date(),
        session_duration_seconds: data.sessionDurationSeconds ?? 0,
        status: data.status ?? "completed",
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async incrementSetTimesStudied(flashcardSetId, userId) {
    return prisma.cnt_flashcards.update({
      where: { flashcard_set_id: flashcardSetId },
      data: {
        times_studied: { increment: 1 },
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async getMaxCardOrder(flashcardSetId) {
    const agg = await prisma.cnt_flashcard_items.aggregate({
      where: { flashcard_set_id: flashcardSetId },
      _max: { card_order: true },
    });
    return agg._max?.card_order ?? 0;
  },

  async createItem(data) {
    return prisma.cnt_flashcard_items.create({
      data: {
        flashcard_set_id: data.flashcardSetId,
        front_text: data.frontText,
        back_text: data.backText,
        front_image_url: data.frontImageUrl ?? null,
        back_image_url: data.backImageUrl ?? null,
        card_order: data.cardOrder,
        hint_text: data.hintText ?? null,
        ease_factor: data.easeFactor ?? 2.5,
        interval_days: data.intervalDays ?? 0,
        created_by: data.createdBy,
        status: "active",
      },
    });
  },

  async updateItem(flashcardItemId, data) {
    return prisma.cnt_flashcard_items.update({
      where: { flashcard_item_id: flashcardItemId },
      data: {
        ...(data.frontText != null && { front_text: data.frontText }),
        ...(data.backText != null && { back_text: data.backText }),
        ...(data.frontImageUrl !== undefined && { front_image_url: data.frontImageUrl }),
        ...(data.backImageUrl !== undefined && { back_image_url: data.backImageUrl }),
        ...(data.cardOrder != null && { card_order: data.cardOrder }),
        ...(data.hintText !== undefined && { hint_text: data.hintText }),
        ...(data.easeFactor != null && { ease_factor: data.easeFactor }),
        ...(data.intervalDays != null && { interval_days: data.intervalDays }),
        ...(data.status != null && { status: data.status }),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async deleteItem(flashcardItemId) {
    return prisma.cnt_flashcard_items.delete({
      where: { flashcard_item_id: flashcardItemId },
    });
  },

  async updateSetTotalCards(flashcardSetId, delta) {
    const set = await prisma.cnt_flashcards.findUnique({
      where: { flashcard_set_id: flashcardSetId },
      select: { total_cards: true },
    });
    if (!set) return null;
    const newTotal = Math.max(0, (set.total_cards ?? 0) + delta);
    return prisma.cnt_flashcards.update({
      where: { flashcard_set_id: flashcardSetId },
      data: { total_cards: newTotal },
    });
  },
};

module.exports = flashcardRepository;

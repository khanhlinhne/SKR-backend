const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const flashcardRepository = require("../repositories/flashcard.repository");
const courseRepository = require("../repositories/course.repository");
const enrollmentRepository = require("../repositories/enrollment.repository");
const flashcardDto = require("../dtos/flashcard.dto");

const VALID_VISIBILITY = ["public", "private", "premium_only", "unlisted"];
const VALID_STATUS_SET = ["draft", "active", "archived"];
const VALID_REVIEW_RESULTS = ["correct", "incorrect", "skip"];
const PUBLIC_FLASHCARD_PREVIEW_LIMIT = 4;

function normalizeOptionalId(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  return value;
}

async function validateLessonAndCourse(lessonId, courseId) {
  if (lessonId) {
    const lesson = await prisma.mst_lessons.findUnique({
      where: { lesson_id: lessonId },
      select: { lesson_id: true },
    });
    if (!lesson) throw AppError.badRequest("Lesson not found with the given lessonId");
  }
  if (courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.badRequest("Course not found with the given courseId");
  }
}

function ensureSetReadable(set, userId) {
  if (!set) throw AppError.notFound("Flashcard set not found");
  if (set.creator_id !== userId && set.visibility === "private") {
    throw AppError.forbidden("You do not have access to this flashcard set");
  }
}

function ensureSetPubliclyReadable(set) {
  if (!set || set.visibility !== "public" || set.status !== "active") {
    throw AppError.notFound("Flashcard set not found");
  }
}

function ensureSetOwned(set, userId) {
  if (!set) throw AppError.notFound("Flashcard set not found");
  if (set.creator_id !== userId) {
    throw AppError.forbidden("You can only manage your own flashcard sets");
  }
}

async function ensureSetReadableForUser(set, userId) {
  ensureSetReadable(set, userId);

  if (set.creator_id === userId) {
    return;
  }

  if (set.visibility === "premium_only" && set.course_id) {
    const purchase = await enrollmentRepository.findByUserAndCourse(userId, set.course_id);
    if (!purchase || purchase.status !== "active") {
      throw AppError.forbidden("You need to purchase this course to access its flashcards");
    }
  }
}

function toNumber(value, fallback = 0) {
  const parsed = value == null ? fallback : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeImageField(...candidates) {
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const value = String(candidate).trim();
    if (!value) continue;
    return value;
  }
  return null;
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function buildReviewSchedule(result, previousEaseFactor, previousIntervalDays) {
  const safeEaseFactor = Math.max(1.3, toNumber(previousEaseFactor, 2.5));
  const safeIntervalDays = Math.max(0, Math.round(toNumber(previousIntervalDays, 0)));

  if (result === "correct") {
    const newEaseFactor = Math.min(5, roundToTwo(safeEaseFactor + 0.15));
    const newIntervalDays =
      safeIntervalDays <= 0 ? 1 : Math.max(Math.round(safeIntervalDays * newEaseFactor), safeIntervalDays + 1);

    return {
      userRating: 2,
      wasCorrect: true,
      previousEaseFactor: safeEaseFactor,
      newEaseFactor,
      previousIntervalDays: safeIntervalDays,
      newIntervalDays,
      nextReviewAtUtc: new Date(Date.now() + newIntervalDays * 24 * 60 * 60 * 1000),
      reviewStatus: "completed",
    };
  }

  if (result === "incorrect") {
    const newEaseFactor = Math.max(1.3, roundToTwo(safeEaseFactor - 0.2));

    return {
      userRating: 1,
      wasCorrect: false,
      previousEaseFactor: safeEaseFactor,
      newEaseFactor,
      previousIntervalDays: safeIntervalDays,
      newIntervalDays: 0,
      nextReviewAtUtc: new Date(),
      reviewStatus: "completed",
    };
  }

  return {
    userRating: null,
    wasCorrect: null,
    previousEaseFactor: safeEaseFactor,
    newEaseFactor: safeEaseFactor,
    previousIntervalDays: safeIntervalDays,
    newIntervalDays: safeIntervalDays,
    nextReviewAtUtc: new Date(),
    reviewStatus: "skipped",
  };
}

async function getDeckProgress(userId, flashcardSetId) {
  const progressMap = await flashcardRepository.getUserSetProgressMap(userId, [flashcardSetId]);
  return progressMap.get(flashcardSetId) || { masteredCount: 0, dueToday: 0 };
}

function redactItemsForGuest(items = []) {
  return items.map((item, index) => {
    if (index < PUBLIC_FLASHCARD_PREVIEW_LIMIT) {
      return {
        ...item,
        isLocked: false,
      };
    }

    return {
      ...item,
      backText: "",
      isLocked: true,
    };
  });
}

const flashcardService = {
  async getPublicSets(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 6, 1), 100);
    const skip = (page - 1) * limit;

    const { items, totalItems } = await flashcardRepository.findPublicSets({
      courseId: normalizeOptionalId(query.courseId),
      search: typeof query.search === "string" ? query.search.trim() : undefined,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map(flashcardDto.setToListItem),
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

  async getPublicSetById(flashcardSetId, userId) {
    const set = await flashcardRepository.findSetById(flashcardSetId);
    ensureSetPubliclyReadable(set);

    const deckProgress = userId ? await getDeckProgress(userId, flashcardSetId) : {};
    const detail = flashcardDto.setToDetail({ ...set, ...deckProgress });
    const items = userId ? detail.items : redactItemsForGuest(detail.items);

    return {
      ...detail,
      items,
      previewLimit: PUBLIC_FLASHCARD_PREVIEW_LIMIT,
      requiresLoginForFullAccess: !userId,
    };
  },

  async getMySets(userId, query) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to list flashcard sets.");
    }
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const where = { lesson_id: null };
    if (query.status) where.status = query.status;
    if (query.visibility) where.visibility = query.visibility;

    const { items, totalItems } = await flashcardRepository.findAccessibleSets(userId, {
      where,
      orderBy: { created_at_utc: "desc" },
      skip,
      take: limit,
    });

    const progressMap = await flashcardRepository.getUserSetProgressMap(
      userId,
      items.map((item) => item.flashcard_set_id)
    );
    const itemsWithProgress = items.map((item) => ({
      ...item,
      ...(progressMap.get(item.flashcard_set_id) || {}),
    }));

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: itemsWithProgress.map(flashcardDto.setToListItem),
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

  async getSetById(flashcardSetId, userId) {
    const set = await flashcardRepository.findSetById(flashcardSetId);
    await ensureSetReadableForUser(set, userId);
    const deckProgress = await getDeckProgress(userId, flashcardSetId);
    return flashcardDto.setToDetail({ ...set, ...deckProgress });
  },

  async createSet(userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to create a flashcard set.");
    }
    if (body.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
      throw AppError.badRequest("Invalid visibility");
    }
    const lessonId = normalizeOptionalId(body.lessonId);
    const courseId = normalizeOptionalId(body.courseId);
    await validateLessonAndCourse(lessonId, courseId);

    const set = await flashcardRepository.createSet({
      setTitle: body.setTitle,
      setDescription: body.setDescription,
      setCoverImageUrl: body.setCoverImageUrl,
      creatorId: userId,
      lessonId,
      courseId,
      visibility: body.visibility ?? "private",
      tags: body.tags,
      status: body.status ?? "draft",
      createdBy: userId,
    });
    return flashcardDto.setToDetail(await flashcardRepository.findSetById(set.flashcard_set_id));
  },

  async updateSet(flashcardSetId, userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to update a flashcard set.");
    }
    const set = await flashcardRepository.findSetById(flashcardSetId);
    ensureSetOwned(set, userId);

    if (body.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
      throw AppError.badRequest("Invalid visibility");
    }
    if (body.status && !VALID_STATUS_SET.includes(body.status)) {
      throw AppError.badRequest("Invalid status");
    }

    const lessonId = body.lessonId !== undefined ? normalizeOptionalId(body.lessonId) : undefined;
    const courseId = body.courseId !== undefined ? normalizeOptionalId(body.courseId) : undefined;
    if (lessonId !== undefined || courseId !== undefined) {
      await validateLessonAndCourse(lessonId || null, courseId || null);
    }

    await flashcardRepository.updateSet(flashcardSetId, {
      setTitle: body.setTitle,
      setDescription: body.setDescription,
      setCoverImageUrl: body.setCoverImageUrl,
      lessonId,
      courseId,
      visibility: body.visibility,
      tags: body.tags,
      status: body.status,
      updatedBy: userId,
    });
    return flashcardService.getSetById(flashcardSetId, userId);
  },

  async deleteSet(flashcardSetId, userId) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to delete a flashcard set.");
    }
    const set = await flashcardRepository.findSetById(flashcardSetId);
    ensureSetOwned(set, userId);
    await flashcardRepository.deleteSet(flashcardSetId);
    return { deleted: true, flashcardSetId };
  },

  async getItems(flashcardSetId, userId) {
    const set = await flashcardRepository.findSetById(flashcardSetId);
    await ensureSetReadableForUser(set, userId);
    return (set.cnt_flashcard_items || []).map(flashcardDto.itemToResponse);
  },

  async createItem(flashcardSetId, userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to add flashcard items.");
    }
    const set = await flashcardRepository.findSetById(flashcardSetId);
    ensureSetOwned(set, userId);

    const cardOrder =
      body.cardOrder != null
        ? body.cardOrder
        : (await flashcardRepository.getMaxCardOrder(flashcardSetId)) + 1;

    const frontImageUrl = normalizeImageField(body.frontImageUrl, body.frontImage, body.frontMediaUrl);
    const backImageUrl = normalizeImageField(body.backImageUrl, body.backImage, body.backMediaUrl);

    const item = await flashcardRepository.createItem({
      flashcardSetId,
      frontText: body.frontText,
      backText: body.backText,
      frontImageUrl,
      backImageUrl,
      cardOrder,
      hintText: body.hintText,
      easeFactor: body.easeFactor,
      intervalDays: body.intervalDays,
      createdBy: userId,
    });
    await flashcardRepository.updateSetTotalCards(flashcardSetId, 1);
    return flashcardDto.itemToResponse(item);
  },

  async updateItem(flashcardSetId, flashcardItemId, userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to update flashcard items.");
    }
    const set = await flashcardRepository.findSetById(flashcardSetId);
    ensureSetOwned(set, userId);

    const item = await flashcardRepository.findItemById(flashcardItemId);
    if (!item || item.flashcard_set_id !== flashcardSetId) {
      throw AppError.notFound("Flashcard item not found");
    }

    const frontImageProvided =
      Object.prototype.hasOwnProperty.call(body, "frontImageUrl") ||
      Object.prototype.hasOwnProperty.call(body, "frontImage") ||
      Object.prototype.hasOwnProperty.call(body, "frontMediaUrl");
    const backImageProvided =
      Object.prototype.hasOwnProperty.call(body, "backImageUrl") ||
      Object.prototype.hasOwnProperty.call(body, "backImage") ||
      Object.prototype.hasOwnProperty.call(body, "backMediaUrl");
    const frontImageUrl = frontImageProvided
      ? normalizeImageField(body.frontImageUrl, body.frontImage, body.frontMediaUrl)
      : undefined;
    const backImageUrl = backImageProvided
      ? normalizeImageField(body.backImageUrl, body.backImage, body.backMediaUrl)
      : undefined;

    await flashcardRepository.updateItem(flashcardItemId, {
      frontText: body.frontText,
      backText: body.backText,
      frontImageUrl,
      backImageUrl,
      cardOrder: body.cardOrder,
      hintText: body.hintText,
      easeFactor: body.easeFactor,
      intervalDays: body.intervalDays,
      status: body.status,
      updatedBy: userId,
    });
    const updated = await flashcardRepository.findItemById(flashcardItemId);
    return flashcardDto.itemToResponse(updated);
  },

  async deleteItem(flashcardSetId, flashcardItemId, userId) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to delete flashcard items.");
    }
    const set = await flashcardRepository.findSetById(flashcardSetId);
    ensureSetOwned(set, userId);

    const item = await flashcardRepository.findItemById(flashcardItemId);
    if (!item || item.flashcard_set_id !== flashcardSetId) {
      throw AppError.notFound("Flashcard item not found");
    }

    await flashcardRepository.deleteItem(flashcardItemId);
    await flashcardRepository.updateSetTotalCards(flashcardSetId, -1);
    return { deleted: true, flashcardItemId };
  },

  async startStudySession(flashcardSetId, userId) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to start a study session.");
    }

    // Use lightweight query - total_cards is already stored on the set
    const set = await flashcardRepository.findSetBasicById(flashcardSetId);
    await ensureSetReadableForUser(set, userId);

    const totalCards = set.total_cards ?? 0;
    const session = await flashcardRepository.createStudySession({
      userId,
      flashcardSetId,
      totalCards,
      createdBy: userId,
    });

    return {
      session: flashcardDto.sessionToResponse(session),
      deckProgress: await getDeckProgress(userId, flashcardSetId),
    };
  },

  async submitStudyReview(flashcardSetId, sessionId, userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to save flashcard progress.");
    }
    if (!VALID_REVIEW_RESULTS.includes(body.result)) {
      throw AppError.badRequest("result must be correct, incorrect or skip");
    }

    // Use lightweight query - no need to load all items for a single review
    const set = await flashcardRepository.findSetBasicById(flashcardSetId);
    await ensureSetReadableForUser(set, userId);

    const session = await flashcardRepository.findStudySessionById(sessionId);
    if (!session || session.flashcard_set_id !== flashcardSetId) {
      throw AppError.notFound("Study session not found");
    }
    if (session.user_id !== userId) {
      throw AppError.forbidden("You can only update your own study session");
    }
    if (session.status === "completed" || session.status === "abandoned") {
      throw AppError.badRequest("This study session has already ended");
    }

    const item = await flashcardRepository.findItemById(body.flashcardItemId);
    if (!item || item.flashcard_set_id !== flashcardSetId || item.status !== "active") {
      throw AppError.notFound("Flashcard item not found");
    }

    const latestReview = await flashcardRepository.findLatestReviewByUserAndItem(userId, body.flashcardItemId);
    const schedule = buildReviewSchedule(
      body.result,
      latestReview?.new_ease_factor ?? item.ease_factor,
      latestReview?.new_interval_days ?? item.interval_days
    );

    const currentSessionReview = await flashcardRepository.findSessionReviewByItem(sessionId, body.flashcardItemId);
    let review;

    const reviewPayload = {
      userRating: schedule.userRating,
      wasCorrect: schedule.wasCorrect,
      timeToAnswerSeconds: body.timeToAnswerSeconds ?? 0,
      previousEaseFactor: schedule.previousEaseFactor,
      newEaseFactor: schedule.newEaseFactor,
      previousIntervalDays: schedule.previousIntervalDays,
      newIntervalDays: schedule.newIntervalDays,
      nextReviewAtUtc: schedule.nextReviewAtUtc,
      status: schedule.reviewStatus ?? "completed",
    };

    if (currentSessionReview) {
      review = await flashcardRepository.updateStudyReview(currentSessionReview.review_id, {
        ...reviewPayload,
        updatedBy: userId,
      });
    } else {
      review = await flashcardRepository.createStudyReview({
        sessionId,
        userId,
        flashcardItemId: body.flashcardItemId,
        ...reviewPayload,
        createdBy: userId,
      });
    }

    const updatedSession = await flashcardRepository.refreshStudySessionStats(sessionId, session.total_cards, userId);

    return {
      review: flashcardDto.reviewToResponse(review),
      session: flashcardDto.sessionToResponse(updatedSession),
      deckProgress: await getDeckProgress(userId, flashcardSetId),
    };
  },

  /**
   * Batch submit multiple reviews in one request.
   * Drastically reduces DB round-trips: 1 set check + 1 session check + N reviews in 1 transaction.
   */
  async submitStudyReviewBatch(flashcardSetId, sessionId, userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to save flashcard progress.");
    }

    const reviews = body.reviews;
    if (!Array.isArray(reviews) || reviews.length === 0) {
      throw AppError.badRequest("reviews must be a non-empty array");
    }
    if (reviews.length > 50) {
      throw AppError.badRequest("Cannot submit more than 50 reviews at once");
    }

    // Validate all results upfront
    for (const review of reviews) {
      if (!VALID_REVIEW_RESULTS.includes(review.result)) {
        throw AppError.badRequest("Each review result must be correct, incorrect or skip");
      }
      if (!review.flashcardItemId) {
        throw AppError.badRequest("Each review must have a flashcardItemId");
      }
    }

    // 1 lightweight query for permission check (no items loaded)
    const set = await flashcardRepository.findSetBasicById(flashcardSetId);
    await ensureSetReadableForUser(set, userId);

    // 1 query for session validation
    const session = await flashcardRepository.findStudySessionById(sessionId);
    if (!session || session.flashcard_set_id !== flashcardSetId) {
      throw AppError.notFound("Study session not found");
    }
    if (session.user_id !== userId) {
      throw AppError.forbidden("You can only update your own study session");
    }
    if (session.status === "completed" || session.status === "abandoned") {
      throw AppError.badRequest("This study session has already ended");
    }

    // Batch load all needed items in 1 query
    const itemIds = [...new Set(reviews.map((r) => r.flashcardItemId))];
    const items = await prisma.cnt_flashcard_items.findMany({
      where: {
        flashcard_item_id: { in: itemIds },
        flashcard_set_id: flashcardSetId,
        status: "active",
      },
      select: {
        flashcard_item_id: true,
        ease_factor: true,
        interval_days: true,
      },
    });
    const itemMap = new Map(items.map((item) => [item.flashcard_item_id, item]));

    // Batch load latest reviews for all items in 1 query
    const latestReviews = await prisma.lrn_flashcard_reviews.findMany({
      where: {
        user_id: userId,
        flashcard_item_id: { in: itemIds },
      },
      orderBy: [{ flashcard_item_id: "asc" }, { created_at_utc: "desc" }],
      select: {
        flashcard_item_id: true,
        new_ease_factor: true,
        new_interval_days: true,
      },
    });
    const latestReviewMap = new Map();
    for (const r of latestReviews) {
      if (!latestReviewMap.has(r.flashcard_item_id)) {
        latestReviewMap.set(r.flashcard_item_id, r);
      }
    }

    // Batch load existing session reviews in 1 query
    const existingSessionReviews = await prisma.lrn_flashcard_reviews.findMany({
      where: {
        session_id: sessionId,
        flashcard_item_id: { in: itemIds },
      },
      select: {
        review_id: true,
        flashcard_item_id: true,
      },
    });
    const sessionReviewMap = new Map(
      existingSessionReviews.map((r) => [r.flashcard_item_id, r])
    );

    // Build all review operations
    const createOperations = [];
    const updateOperations = [];
    const skippedItemIds = [];

    for (const review of reviews) {
      const item = itemMap.get(review.flashcardItemId);
      if (!item) {
        skippedItemIds.push(review.flashcardItemId);
        continue;
      }

      const latestReview = latestReviewMap.get(review.flashcardItemId);
      const schedule = buildReviewSchedule(
        review.result,
        latestReview?.new_ease_factor ?? item.ease_factor,
        latestReview?.new_interval_days ?? item.interval_days
      );

      const reviewPayload = {
        userRating: schedule.userRating,
        wasCorrect: schedule.wasCorrect,
        timeToAnswerSeconds: review.timeToAnswerSeconds ?? 0,
        previousEaseFactor: schedule.previousEaseFactor,
        newEaseFactor: schedule.newEaseFactor,
        previousIntervalDays: schedule.previousIntervalDays,
        newIntervalDays: schedule.newIntervalDays,
        nextReviewAtUtc: schedule.nextReviewAtUtc,
        status: schedule.reviewStatus ?? "completed",
      };

      const existingReview = sessionReviewMap.get(review.flashcardItemId);
      if (existingReview) {
        updateOperations.push({
          reviewId: existingReview.review_id,
          ...reviewPayload,
          updatedBy: userId,
        });
      } else {
        createOperations.push({
          sessionId,
          userId,
          flashcardItemId: review.flashcardItemId,
          ...reviewPayload,
          createdBy: userId,
        });
      }
    }

    // Execute all DB writes in a single transaction
    const transactionOps = [
      ...createOperations.map((data) =>
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
      ),
      ...updateOperations.map((data) =>
        prisma.lrn_flashcard_reviews.update({
          where: { review_id: data.reviewId },
          data: {
            user_rating: data.userRating,
            was_correct: data.wasCorrect,
            time_to_answer_seconds: data.timeToAnswerSeconds ?? 0,
            previous_ease_factor: data.previousEaseFactor,
            new_ease_factor: data.newEaseFactor,
            previous_interval_days: data.previousIntervalDays ?? 0,
            new_interval_days: data.newIntervalDays ?? 0,
            next_review_at_utc: data.nextReviewAtUtc,
            updated_by: data.updatedBy,
            updated_at_utc: new Date(),
            status: data.status ?? "completed",
          },
        })
      ),
    ];

    if (transactionOps.length > 0) {
      await prisma.$transaction(transactionOps);
    }

    // 1 refresh at the end instead of N
    const updatedSession = await flashcardRepository.refreshStudySessionStats(
      sessionId,
      session.total_cards,
      userId
    );

    return {
      processedCount: createOperations.length + updateOperations.length,
      skippedCount: skippedItemIds.length,
      session: flashcardDto.sessionToResponse(updatedSession),
      deckProgress: await getDeckProgress(userId, flashcardSetId),
    };
  },
  async completeStudySession(flashcardSetId, sessionId, userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to complete a study session.");
    }

    const session = await flashcardRepository.findStudySessionById(sessionId);
    if (!session || session.flashcard_set_id !== flashcardSetId) {
      throw AppError.notFound("Study session not found");
    }
    if (session.user_id !== userId) {
      throw AppError.forbidden("You can only complete your own study session");
    }

    let finalizedSession = session;
    if (session.status !== "completed" && session.status !== "abandoned") {
      finalizedSession = await flashcardRepository.completeStudySession(sessionId, {
        sessionDurationSeconds: body.sessionDurationSeconds ?? 0,
        updatedBy: userId,
        status: "completed",
      });

      if ((finalizedSession.cards_reviewed ?? 0) > 0) {
        await flashcardRepository.incrementSetTimesStudied(flashcardSetId, userId);
      }
    }

    return {
      session: flashcardDto.sessionToResponse(finalizedSession),
      deckProgress: await getDeckProgress(userId, flashcardSetId),
    };
  },
};

module.exports = flashcardService;

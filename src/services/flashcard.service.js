const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const flashcardRepository = require("../repositories/flashcard.repository");
const subjectRepository = require("../repositories/subject.repository");
const flashcardDto = require("../dtos/flashcard.dto");

const VALID_VISIBILITY = ["public", "private", "premium_only", "unlisted"];
const VALID_STATUS_SET = ["draft", "active", "archived"];

function normalizeOptionalId(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  return value;
}

async function validateLessonAndSubject(lessonId, subjectId) {
  if (lessonId) {
    const lesson = await prisma.mst_lessons.findUnique({
      where: { lesson_id: lessonId },
      select: { lesson_id: true },
    });
    if (!lesson) throw AppError.badRequest("Lesson not found with the given lessonId");
  }
  if (subjectId) {
    const subject = await subjectRepository.findById(subjectId);
    if (!subject) throw AppError.badRequest("Subject not found with the given subjectId");
  }
}

const flashcardService = {
  async getMySets(userId, query) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to list your sets.");
    }
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const where = {};
    if (query.status) where.status = query.status;
    if (query.visibility) where.visibility = query.visibility;

    const { items, totalItems } = await flashcardRepository.findSetsByCreator(userId, {
      where,
      orderBy: { created_at_utc: "desc" },
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

  async getSetById(flashcardSetId, userId) {
    const set = await flashcardRepository.findSetById(flashcardSetId);
    if (!set) throw AppError.notFound("Flashcard set not found");
    if (set.creator_id !== userId && set.visibility === "private") {
      throw AppError.forbidden("You do not have access to this flashcard set");
    }
    return flashcardDto.setToDetail(set);
  },

  async createSet(userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to create a flashcard set.");
    }
    if (body.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
      throw AppError.badRequest("Invalid visibility");
    }
    const lessonId = normalizeOptionalId(body.lessonId);
    const subjectId = normalizeOptionalId(body.subjectId);
    await validateLessonAndSubject(lessonId, subjectId);

    const set = await flashcardRepository.createSet({
      setTitle: body.setTitle,
      setDescription: body.setDescription,
      setCoverImageUrl: body.setCoverImageUrl,
      creatorId: userId,
      lessonId,
      subjectId,
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
    if (!set) throw AppError.notFound("Flashcard set not found");
    if (set.creator_id !== userId) throw AppError.forbidden("You can only edit your own flashcard sets");

    if (body.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
      throw AppError.badRequest("Invalid visibility");
    }
    if (body.status && !VALID_STATUS_SET.includes(body.status)) {
      throw AppError.badRequest("Invalid status");
    }

    const lessonId = body.lessonId !== undefined ? normalizeOptionalId(body.lessonId) : undefined;
    const subjectId = body.subjectId !== undefined ? normalizeOptionalId(body.subjectId) : undefined;
    if (lessonId !== undefined || subjectId !== undefined) {
      await validateLessonAndSubject(lessonId || null, subjectId || null);
    }

    await flashcardRepository.updateSet(flashcardSetId, {
      setTitle: body.setTitle,
      setDescription: body.setDescription,
      setCoverImageUrl: body.setCoverImageUrl,
      lessonId,
      subjectId,
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
    if (!set) throw AppError.notFound("Flashcard set not found");
    if (set.creator_id !== userId) throw AppError.forbidden("You can only delete your own flashcard sets");
    await flashcardRepository.deleteSet(flashcardSetId);
    return { deleted: true, flashcardSetId };
  },

  async getItems(flashcardSetId, userId) {
    const set = await flashcardRepository.findSetById(flashcardSetId);
    if (!set) throw AppError.notFound("Flashcard set not found");
    if (set.creator_id !== userId && set.visibility === "private") {
      throw AppError.forbidden("You do not have access to this flashcard set");
    }
    return (set.cnt_flashcard_items || []).map(flashcardDto.itemToResponse);
  },

  async createItem(flashcardSetId, userId, body) {
    if (userId == null) {
      throw AppError.unauthorized("Authentication required to add flashcard items.");
    }
    const set = await flashcardRepository.findSetById(flashcardSetId);
    if (!set) throw AppError.notFound("Flashcard set not found");
    if (set.creator_id !== userId) throw AppError.forbidden("You can only add items to your own sets");

    const cardOrder =
      body.cardOrder != null
        ? body.cardOrder
        : (await flashcardRepository.getMaxCardOrder(flashcardSetId)) + 1;

    const item = await flashcardRepository.createItem({
      flashcardSetId,
      frontText: body.frontText,
      backText: body.backText,
      frontImageUrl: body.frontImageUrl,
      backImageUrl: body.backImageUrl,
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
    if (!set) throw AppError.notFound("Flashcard set not found");
    if (set.creator_id !== userId) throw AppError.forbidden("You can only edit items in your own sets");

    const item = await flashcardRepository.findItemById(flashcardItemId);
    if (!item || item.flashcard_set_id !== flashcardSetId) {
      throw AppError.notFound("Flashcard item not found");
    }

    await flashcardRepository.updateItem(flashcardItemId, {
      frontText: body.frontText,
      backText: body.backText,
      frontImageUrl: body.frontImageUrl,
      backImageUrl: body.backImageUrl,
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
    if (!set) throw AppError.notFound("Flashcard set not found");
    if (set.creator_id !== userId) throw AppError.forbidden("You can only delete items from your own sets");

    const item = await flashcardRepository.findItemById(flashcardItemId);
    if (!item || item.flashcard_set_id !== flashcardSetId) {
      throw AppError.notFound("Flashcard item not found");
    }

    await flashcardRepository.deleteItem(flashcardItemId);
    await flashcardRepository.updateSetTotalCards(flashcardSetId, -1);
    return { deleted: true, flashcardItemId };
  },
};

module.exports = flashcardService;

const prisma = require("../config/prisma");

const flashcardRepository = {
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

  async createSet(data) {
    const lessonId = data.lessonId && String(data.lessonId).trim() ? data.lessonId : null;
    const subjectId = data.subjectId && String(data.subjectId).trim() ? data.subjectId : null;
    return prisma.cnt_flashcards.create({
      data: {
        set_title: data.setTitle,
        set_description: data.setDescription ?? null,
        set_cover_image_url: data.setCoverImageUrl ?? null,
        creator_id: data.creatorId,
        lesson_id: lessonId,
        subject_id: subjectId,
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
    const subjectId = data.subjectId !== undefined
      ? (data.subjectId && String(data.subjectId).trim() ? data.subjectId : null)
      : undefined;
    return prisma.cnt_flashcards.update({
      where: { flashcard_set_id: flashcardSetId },
      data: {
        ...(data.setTitle != null && { set_title: data.setTitle }),
        ...(data.setDescription !== undefined && { set_description: data.setDescription }),
        ...(data.setCoverImageUrl !== undefined && { set_cover_image_url: data.setCoverImageUrl }),
        ...(lessonId !== undefined && { lesson_id: lessonId }),
        ...(subjectId !== undefined && { subject_id: subjectId }),
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

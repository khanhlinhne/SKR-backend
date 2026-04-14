const prisma = require("../config/prisma");

const aiQuestionGenerationRepository = {
  async create(data) {
    return prisma.ai_question_generations.create({
      data: {
        user_id: data.userId,
        source_type: data.sourceType,
        source_content: data.sourceContent ?? null,
        quantity_requested: data.quantityRequested,
        quantity_generated: data.quantityGenerated ?? 0,
        generated_questions: data.generatedQuestions ?? undefined,
        difficulty_level: data.difficultyLevel ?? null,
        question_type: data.questionType ?? null,
        language_code: data.languageCode ?? "en",
        ai_model: data.aiModel ?? null,
        ai_provider: data.aiProvider ?? "google_gemini",
        processing_started_at_utc: data.processingStartedAtUtc ?? new Date(),
        processing_completed_at_utc: data.processingCompletedAtUtc ?? new Date(),
        processing_duration_seconds: data.processingDurationSeconds ?? null,
        status: data.status ?? "completed",
        created_by: data.createdBy,
      },
    });
  },

  async findMany({ userId, skip = 0, take = 20, status } = {}) {
    const where = {
      ...(userId ? { user_id: userId } : {}),
      ...(status ? { status } : {}),
    };
    const [items, totalItems] = await prisma.$transaction([
      prisma.ai_question_generations.findMany({
        where,
        orderBy: { created_at_utc: "desc" },
        skip,
        take,
        select: {
          generation_id: true,
          user_id: true,
          source_type: true,
          source_content: true,
          quantity_requested: true,
          quantity_generated: true,
          difficulty_level: true,
          language_code: true,
          ai_model: true,
          status: true,
          user_reviewed: true,
          created_at_utc: true,
        },
      }),
      prisma.ai_question_generations.count({ where }),
    ]);
    return { items, totalItems };
  },

  async findById(generationId) {
    return prisma.ai_question_generations.findUnique({
      where: { generation_id: generationId },
    });
  },

  async findByIdForUser(generationId, userId) {
    return prisma.ai_question_generations.findFirst({
      where: { generation_id: generationId, user_id: userId },
    });
  },

  async updateGeneratedQuestions(generationId, userId, data) {
    const result = await prisma.ai_question_generations.updateMany({
      where: { generation_id: generationId, user_id: userId },
      data: {
        generated_questions: data.generatedQuestions,
        quantity_generated: data.quantityGenerated,
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
    return result.count > 0;
  },
};

module.exports = aiQuestionGenerationRepository;

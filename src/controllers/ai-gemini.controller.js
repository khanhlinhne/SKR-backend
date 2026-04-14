const aiGeminiService = require("../services/ai-gemini.service");
const { success } = require("../utils/response.util");

const aiGeminiController = {
  async generateQuestions(req, res, next) {
    try {
      const data = await aiGeminiService.generateQuestionsFromContent({
        content: req.body.content,
        questionCount: req.body.questionCount,
        difficulty: req.body.difficulty,
        language: req.body.language,
        userId: req.user?.userId,
      });
      const message = data.persisted
        ? "AI generated draft questions (review before publishing)"
        : "AI generated draft questions (not saved to DB). Use Authorization: Bearer <JWT> on POST, or set AI_PUBLIC_GENERATION_OWNER_USER_ID to a valid mst_users.user_id for anonymous saves visible to everyone.";
      return success(res, {
        message,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async refineQuestions(req, res, next) {
    try {
      const data = await aiGeminiService.refineQuestionsForReview({
        questions: req.body.questions,
        reviewNotes: req.body.reviewNotes,
        language: req.body.language,
        userId: req.user?.userId,
        generationId: req.body.generationId,
      });
      return success(res, {
        message: "AI refined questions based on your review",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async explainQuestion(req, res, next) {
    try {
      const data = await aiGeminiService.explainQuestion({
        questionText: req.body.questionText,
        options: req.body.options,
        correctAnswerSummary: req.body.correctAnswerSummary,
        userAnswerSummary: req.body.userAnswerSummary,
        context: req.body.context,
        language: req.body.language,
      });
      return success(res, {
        message: "Explanation generated",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async listGenerations(req, res, next) {
    try {
      res.set("Cache-Control", "no-store, private");
      const data = await aiGeminiService.listGenerations(req.query);
      return success(res, { message: "AI generations retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getGenerationById(req, res, next) {
    try {
      res.set("Cache-Control", "no-store, private");
      const data = await aiGeminiService.getGenerationById(req.params.generationId);
      return success(res, { message: "AI generation retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = aiGeminiController;

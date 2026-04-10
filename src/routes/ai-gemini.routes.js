const { Router } = require("express");
const aiGeminiController = require("../controllers/ai-gemini.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticateOptional } = require("../middlewares/auth.middleware");
const {
  generateQuestionsRules,
  refineQuestionsRules,
  explainQuestionRules,
  listGenerationsRules,
  getGenerationByIdRules,
} = require("../validators/ai-gemini.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: AI Gemini
 *     description: AI-assisted quiz generation. GET generations are public. Saves to DB when Bearer is sent, or when AI_PUBLIC_GENERATION_OWNER_USER_ID is set (shared anonymous owner).
 */

/**
 * @swagger
 * /api/ai-gemini/generate-questions:
 *   post:
 *     tags: [AI Gemini]
 *     summary: Generate draft quiz questions from content
 *     description: |
 *       Returns `data.questions`. Persists when **Authorization: Bearer &lt;JWT&gt;** is sent, or when **AI_PUBLIC_GENERATION_OWNER_USER_ID** is configured (saves under that user so everyone can list via GET /generations).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, description: Source text or lesson content }
 *               questionCount: { type: integer, minimum: 1, maximum: 20, default: 5 }
 *               difficulty: { type: string, enum: [easy, medium, hard] }
 *               language: { type: string, enum: [vi, en] }
 */
router.post(
  "/generate-questions",
  authenticateOptional,
  generateQuestionsRules,
  validate,
  aiGeminiController.generateQuestions
);

/**
 * @swagger
 * /api/ai-gemini/refine-questions:
 *   post:
 *     tags: [AI Gemini]
 *     summary: Refine AI-generated questions after human review
 *     description: |
 *       Body **must** include `questions`: copy the array from `data.questions` returned by **POST /generate-questions** (same shape). Optional `generationId` to update the saved row when using Bearer or public owner user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questions]
 *             properties:
 *               questions:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 30
 *                 description: Same structure as generate-questions output
 *                 items:
 *                   type: object
 *               reviewNotes:
 *                 type: string
 *                 description: What to change (tone, difficulty, fix errors, etc.)
 *               generationId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional — links refine result to DB row
 *               language:
 *                 type: string
 *                 enum: [vi, en]
 *           example:
 *             questions:
 *               - questionText: "JavaScript là gì?"
 *                 questionType: multiple_choice
 *                 difficultyLevel: easy
 *                 options:
 *                   - optionText: "Ngôn ngữ lập trình"
 *                     isCorrect: true
 *                     optionOrder: 0
 *                   - optionText: "IDE"
 *                     isCorrect: false
 *                     optionOrder: 1
 *                 explanation: "JS is a programming language."
 *             reviewNotes: "Rút gọn đáp án, dùng thuật ngữ đơn giản hơn."
 *             language: vi
 */
router.post(
  "/refine-questions",
  authenticateOptional,
  refineQuestionsRules,
  validate,
  aiGeminiController.refineQuestions
);

/**
 * @swagger
 * /api/ai-gemini/explain:
 *   post:
 *     tags: [AI Gemini]
 *     summary: Get AI explanation for a quiz question
 *     description: |
 *       **questionText** (required) is the question stem — the text of the MCQ, not the whole `data` object from generate.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionText]
 *             properties:
 *               questionText:
 *                 type: string
 *                 description: Full question wording (stem)
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *               correctAnswerSummary:
 *                 type: string
 *               userAnswerSummary:
 *                 type: string
 *               context:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [vi, en]
 *           example:
 *             questionText: "Closure trong JavaScript là gì?"
 *             options:
 *               - optionText: "Hàm lồng nhau có thể truy cập biến ngoài"
 *                 isCorrect: true
 *             correctAnswerSummary: "Inner function retains outer scope"
 *             language: vi
 */
router.post("/explain", explainQuestionRules, validate, aiGeminiController.explainQuestion);

/**
 * @swagger
 * /api/ai-gemini/generations:
 *   get:
 *     tags: [AI Gemini]
 *     summary: List AI-generated question batches (newest first)
 *     description: |
 *       Returns `data.items` (may be empty if nothing was saved).
 *       Rows are created only when **POST /generate-questions** is called **with** `Authorization: Bearer <JWT>` (optional auth).
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: userId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Filter by creator user id (optional)
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { type: string, enum: [queued, processing, completed, failed, cancelled] }
 *     responses:
 *       200:
 *         description: Paginated list; `hint` appears when totalItems is 0
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items: { type: object }
 *                     pagination:
 *                       type: object
 *                     hint: { type: string, description: Only when list is empty }
 */
router.get(
  "/generations",
  listGenerationsRules,
  validate,
  aiGeminiController.listGenerations
);

/**
 * @swagger
 * /api/ai-gemini/generations/{generationId}:
 *   get:
 *     tags: [AI Gemini]
 *     summary: Get one AI generation with full questions JSON
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full row including generatedQuestions
 *       404:
 *         description: Not found
 */
router.get(
  "/generations/:generationId",
  getGenerationByIdRules,
  validate,
  aiGeminiController.getGenerationById
);

module.exports = router;

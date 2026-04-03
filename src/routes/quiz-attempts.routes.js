const { Router } = require("express");
const quizController = require("../controllers/quiz.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");
const { getQuizAttemptsRules, quizAttemptIdParamRules, submitQuizAttemptRules } = require("../validators/quiz.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Quiz
 *     description: Quiz practice and attempts
 */

/**
 * @swagger
 * /api/quiz-attempts:
 *   get:
 *     tags: [Quiz]
 *     summary: List my quiz attempts (Quiz Review)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [not_started, in_progress, submitted, graded, expired] }
 *       - in: query
 *         name: practiceTestId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Quiz attempts retrieved successfully
 */
router.get("/", authenticate, getQuizAttemptsRules, validate, quizController.getMyQuizAttempts);

/**
 * @swagger
 * /api/quiz-attempts/{attemptId}:
 *   get:
 *     tags: [Quiz]
 *     summary: View quiz attempt questions (Quiz Handling)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Quiz attempt retrieved successfully
 */
router.get("/:attemptId", authenticate, quizAttemptIdParamRules, validate, quizController.getQuizAttempt);

/**
 * @swagger
 * /api/quiz-attempts/{attemptId}/submit:
 *   post:
 *     tags: [Quiz]
 *     summary: Submit quiz answers and check correct/incorrect
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [questionId]
 *                   properties:
 *                     questionId: { type: string, format: uuid }
 *                     selectedOptionIds:
 *                       type: array
 *                       items: { type: string, format: uuid }
 *                     answerText: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Quiz submitted successfully (Quiz Result)
 */
router.post(
  "/:attemptId/submit",
  authenticate,
  quizAttemptIdParamRules,
  submitQuizAttemptRules,
  validate,
  quizController.submitQuizAttempt,
);

/**
 * @swagger
 * /api/quiz-attempts/{attemptId}/result:
 *   get:
 *     tags: [Quiz]
 *     summary: View quiz result summary
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Quiz result retrieved successfully
 */
router.get("/:attemptId/result", authenticate, quizAttemptIdParamRules, validate, quizController.getQuizAttemptResult);

/**
 * @swagger
 * /api/quiz-attempts/{attemptId}/review:
 *   get:
 *     tags: [Quiz]
 *     summary: Review quiz answers with correct/incorrect
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Quiz review retrieved successfully
 */
router.get("/:attemptId/review", authenticate, quizAttemptIdParamRules, validate, quizController.reviewQuizAttempt);

module.exports = router;


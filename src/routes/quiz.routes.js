const { Router } = require("express");
const quizController = require("../controllers/quiz.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getQuizPracticesRules,
  quizPracticeIdParamRules,
  createQuizPracticeRules,
  updateQuizPracticeRules,
  startQuizAttemptRules,
} = require("../validators/quiz.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Quiz
 *     description: Quiz practice and attempts
 */

/**
 * @swagger
 * /api/quiz-practices:
 *   get:
 *     tags: [Quiz]
 *     summary: Get quiz practices of current user
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
 *         name: search
 *         schema: { type: string }
 *         description: Search by quiz title
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by status (e.g. active, deleted)
 *     responses:
 *       200:
 *         description: Quiz practices retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/", authenticate, getQuizPracticesRules, validate, quizController.getMyQuizPractices);

/**
 * @swagger
 * /api/quiz-practices:
 *   post:
 *     tags: [Quiz]
 *     summary: Create a new quiz practice
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testTitle, totalQuestions]
 *             properties:
 *               testTitle: { type: string, maxLength: 255 }
 *               testDescription: { type: string, nullable: true }
 *               courseIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               difficultyLevels:
 *                 type: array
 *                 items: { type: string, enum: [easy, medium, hard, expert] }
 *               questionTypes:
 *                 type: array
 *                 items: { type: string, enum: [multiple_choice, true_false, essay, short_answer, fill_in_blank] }
 *               totalQuestions: { type: integer, minimum: 1 }
 *               timeLimitMinutes: { type: integer, minimum: 1, nullable: true }
 *               randomizeQuestions: { type: boolean }
 *               randomizeOptions: { type: boolean }
 *               showCorrectAnswers: { type: boolean }
 *     responses:
 *       201:
 *         description: Quiz practice created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 */
router.post("/", authenticate, createQuizPracticeRules, validate, quizController.createQuizPractice);

/**
 * @swagger
 * /api/quiz-practices/{practiceTestId}:
 *   get:
 *     tags: [Quiz]
 *     summary: Get quiz practice details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practiceTestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Quiz practice retrieved successfully
 *       404:
 *         description: Quiz practice not found
 */
router.get(
  "/:practiceTestId",
  authenticate,
  quizPracticeIdParamRules,
  validate,
  quizController.getQuizPracticeDetail,
);

/**
 * @swagger
 * /api/quiz-practices/{practiceTestId}:
 *   patch:
 *     tags: [Quiz]
 *     summary: Update quiz practice
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practiceTestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testTitle: { type: string, maxLength: 255 }
 *               testDescription: { type: string, nullable: true }
 *               courseIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               difficultyLevels:
 *                 type: array
 *                 items: { type: string, enum: [easy, medium, hard, expert] }
 *               questionTypes:
 *                 type: array
 *                 items: { type: string, enum: [multiple_choice, true_false, essay, short_answer, fill_in_blank] }
 *               totalQuestions: { type: integer, minimum: 1 }
 *               timeLimitMinutes: { type: integer, minimum: 1, nullable: true }
 *               randomizeQuestions: { type: boolean }
 *               randomizeOptions: { type: boolean }
 *               showCorrectAnswers: { type: boolean }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Quiz practice updated successfully
 *       404:
 *         description: Quiz practice not found
 */
router.patch(
  "/:practiceTestId",
  authenticate,
  quizPracticeIdParamRules,
  updateQuizPracticeRules,
  validate,
  quizController.updateQuizPractice,
);

/**
 * @swagger
 * /api/quiz-practices/{practiceTestId}:
 *   delete:
 *     tags: [Quiz]
 *     summary: Soft delete quiz practice
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practiceTestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Quiz practice deleted successfully
 */
router.delete(
  "/:practiceTestId",
  authenticate,
  quizPracticeIdParamRules,
  validate,
  quizController.deleteQuizPractice,
);

/**
 * @swagger
 * /api/quiz-practices/{practiceTestId}/attempts:
 *   post:
 *     tags: [Quiz]
 *     summary: Start a quiz attempt (Quiz Handling)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practiceTestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passingScore:
 *                 type: number
 *                 description: Passing score as percentage (0-100)
 *     responses:
 *       201:
 *         description: Quiz attempt started successfully
 *       404:
 *         description: Quiz practice not found
 */
router.post(
  "/:practiceTestId/attempts",
  authenticate,
  quizPracticeIdParamRules,
  startQuizAttemptRules,
  validate,
  quizController.startQuizAttempt,
);

module.exports = router;


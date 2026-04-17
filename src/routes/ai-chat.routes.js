const { Router } = require("express");
const aiChatController = require("../controllers/ai-chat.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { chatRules } = require("../validators/ai-chat.validator");

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: AI Chat
 *     description: Learner assistant that answers using real data from the learner database
 */

/**
 * @swagger
 * /api/ai-chat:
 *   post:
 *     tags: [AI Chat]
 *     summary: Ask the learner AI assistant
 *     description: |
 *       Requires Bearer token. The assistant reads the authenticated learner's study data from the database
 *       (study time, active courses, progress, flashcard reviews, recent quizzes) and answers from that context.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TimezoneOffset'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: Hôm nay tôi đã học bao lâu?
 *               messages:
 *                 type: array
 *                 description: Optional short chat history from the current conversation.
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               language:
 *                 type: string
 *                 enum: [vi, en]
 *                 default: vi
 *               includeContext:
 *                 type: boolean
 *                 default: false
 *                 description: Include the structured learner context used to answer.
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/", chatRules, validate, aiChatController.chat);
router.post("/chat", chatRules, validate, aiChatController.chat);
router.post("/messages", chatRules, validate, aiChatController.chat);

module.exports = router;

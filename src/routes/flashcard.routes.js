const { Router } = require("express");
const flashcardController = require("../controllers/flashcard.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  createSetRules,
  updateSetRules,
  setIdParamRules,
  getMySetsRules,
  getItemsRules,
  startStudySessionRules,
  submitStudyReviewRules,
  completeStudySessionRules,
  itemIdParamRules,
  createItemRules,
  updateItemRules,
} = require("../validators/flashcard.validator");

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Flashcard
 *     description: Flashcard sets and items
 */

/**
 * @swagger
 * /api/flashcard-sets:
 *   get:
 *     tags: [Flashcard]
 *     summary: Get accessible flashcard sets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, active, archived] }
 *       - in: query
 *         name: visibility
 *         schema: { type: string, enum: [public, private, premium_only, unlisted] }
 *     responses:
 *       200:
 *         description: Flashcard sets retrieved successfully
 *       401:
 *         description: Authentication required
 *   post:
 *     tags: [Flashcard]
 *     summary: Create flashcard set
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [setTitle]
 *             properties:
 *               setTitle:
 *                 type: string
 *                 maxLength: 255
 *                 example: My Vocabulary Set
 *               setDescription:
 *                 type: string
 *                 maxLength: 2000
 *               setCoverImageUrl:
 *                 type: string
 *                 format: uri
 *               lessonId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Must exist in mst_lessons. Omit or null to leave unset.
 *               courseId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Must exist in mst_courses. Omit or null to leave unset.
 *               visibility:
 *                 type: string
 *                 enum: [public, private, premium_only, unlisted]
 *                 default: private
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *               status:
 *                 type: string
 *                 enum: [draft, active, archived]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Flashcard set created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 */
router.get("/", getMySetsRules, validate, flashcardController.getMySets);
router.post("/", createSetRules, validate, flashcardController.createSet);

router.post(
  "/:setId/study-sessions",
  startStudySessionRules,
  validate,
  flashcardController.startStudySession
);
router.post(
  "/:setId/study-sessions/:sessionId/reviews",
  submitStudyReviewRules,
  validate,
  flashcardController.submitStudyReview
);
router.post(
  "/:setId/study-sessions/:sessionId/complete",
  completeStudySessionRules,
  validate,
  flashcardController.completeStudySession
);

/**
 * @swagger
 * /api/flashcard-sets/{id}:
 *   get:
 *     tags: [Flashcard]
 *     summary: Get flashcard set by ID (with items)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Flashcard set with items
 *       404:
 *         description: Set not found
 *   patch:
 *     tags: [Flashcard]
 *     summary: Update flashcard set
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               setTitle: { type: string, maxLength: 255 }
 *               setDescription: { type: string, maxLength: 2000 }
 *               setCoverImageUrl: { type: string, format: uri }
 *               lessonId: { type: string, format: uuid }
 *               courseId: { type: string, format: uuid }
 *               visibility: { type: string, enum: [public, private, premium_only, unlisted] }
 *               tags: { type: array, items: { type: string } }
 *               status: { type: string, enum: [draft, active, archived] }
 *     responses:
 *       200:
 *         description: Flashcard set updated successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Set not found
 *   delete:
 *     tags: [Flashcard]
 *     summary: Delete flashcard set
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Flashcard set deleted successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Set not found
 */
router.get("/:id", setIdParamRules, validate, flashcardController.getSetById);
router.patch("/:id", updateSetRules, validate, flashcardController.updateSet);
router.delete("/:id", setIdParamRules, validate, flashcardController.deleteSet);

/**
 * @swagger
 * /api/flashcard-sets/{setId}/items:
 *   get:
 *     tags: [Flashcard]
 *     summary: Get items of a flashcard set
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: setId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of flashcard items
 *       404:
 *         description: Set not found
 *   post:
 *     tags: [Flashcard]
 *     summary: Create flashcard item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: setId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [frontText, backText]
 *             properties:
 *               frontText:
 *                 type: string
 *                 example: Hello
 *               backText:
 *                 type: string
 *                 example: Xin chào
 *               frontImageUrl: { type: string, format: uri }
 *               backImageUrl: { type: string, format: uri }
 *               cardOrder: { type: integer, minimum: 0 }
 *               hintText: { type: string, maxLength: 500 }
 *               easeFactor: { type: number, minimum: 1.3, maximum: 5 }
 *               intervalDays: { type: integer, minimum: 0 }
 *     responses:
 *       201:
 *         description: Flashcard item created successfully
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Set not found
 */
router.get("/:setId/items", getItemsRules, validate, flashcardController.getItems);
router.post(
  "/:setId/items",
  createItemRules,
  validate,
  flashcardController.createItem
);

/**
 * @swagger
 * /api/flashcard-sets/{setId}/items/{itemId}:
 *   patch:
 *     tags: [Flashcard]
 *     summary: Update flashcard item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: setId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               frontText: { type: string }
 *               backText: { type: string }
 *               frontImageUrl: { type: string, format: uri }
 *               backImageUrl: { type: string, format: uri }
 *               cardOrder: { type: integer, minimum: 0 }
 *               hintText: { type: string, maxLength: 500 }
 *               easeFactor: { type: number, minimum: 1.3, maximum: 5 }
 *               intervalDays: { type: integer, minimum: 0 }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Flashcard item updated successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Set or item not found
 *   delete:
 *     tags: [Flashcard]
 *     summary: Delete flashcard item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: setId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Flashcard item deleted successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Set or item not found
 */
router.patch(
  "/:setId/items/:itemId",
  updateItemRules,
  validate,
  flashcardController.updateItem
);
router.delete(
  "/:setId/items/:itemId",
  itemIdParamRules,
  validate,
  flashcardController.deleteItem
);

module.exports = router;

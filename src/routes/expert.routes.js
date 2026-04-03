const { Router } = require("express");
const expertController = require("../controllers/expert.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate, authenticateOptional, authorize } = require("../middlewares/auth.middleware");
const {
  getExpertsRules,
  expertIdParamRules,
  createExpertRules,
  updateExpertRules,
} = require("../validators/expert.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Expert
 *     description: Subject expert profiles (staff-managed)
 */

/**
 * @swagger
 * /api/experts:
 *   get:
 *     tags: [Expert]
 *     summary: List subject experts (public; admins may include inactive)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: string, enum: [true, false] }
 *         description: Admin only — list inactive/deleted profiles
 *     responses:
 *       200:
 *         description: Experts retrieved successfully
 */
router.get("/", authenticateOptional, getExpertsRules, validate, expertController.listExperts);

/**
 * @swagger
 * /api/experts/{expertId}:
 *   get:
 *     tags: [Expert]
 *     summary: Get expert detail
 *     parameters:
 *       - in: path
 *         name: expertId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Expert retrieved successfully
 *       404:
 *         description: Expert not found
 */
router.get("/:expertId", authenticateOptional, expertIdParamRules, validate, expertController.getExpertDetail);

/**
 * @swagger
 * /api/experts:
 *   post:
 *     tags: [Expert]
 *     summary: Add new expert profile (Admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string, format: uuid }
 *               headline: { type: string }
 *               expertiseSummary: { type: string }
 *               subjectCourseIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               displayOrder: { type: integer, minimum: 0 }
 *               assignCreatorRole: { type: boolean, description: "Default true — grant creator role" }
 *     responses:
 *       201:
 *         description: Expert created successfully
 */
router.post("/", authenticate, authorize("admin"), createExpertRules, validate, expertController.createExpert);

/**
 * @swagger
 * /api/experts/{expertId}:
 *   patch:
 *     tags: [Expert]
 *     summary: Update expert (Admin)
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  "/:expertId",
  authenticate,
  authorize("admin"),
  expertIdParamRules,
  updateExpertRules,
  validate,
  expertController.updateExpert,
);

/**
 * @swagger
 * /api/experts/{expertId}:
 *   delete:
 *     tags: [Expert]
 *     summary: Soft-delete expert (Admin)
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  "/:expertId",
  authenticate,
  authorize("admin"),
  expertIdParamRules,
  validate,
  expertController.deleteExpert,
);

module.exports = router;

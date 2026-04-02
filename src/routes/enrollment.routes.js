const { Router } = require("express");
const enrollmentController = require("../controllers/enrollment.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Enrollments
 *     description: User course enrollment management
 */

/**
 * @swagger
 * /api/enrollments/my:
 *   get:
 *     tags: [Enrollments]
 *     summary: Get my purchased courses (enrollments)
 *     description: Returns all courses that the authenticated user has purchased, including progress data.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Enrollments retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/my", enrollmentController.getMyEnrollments);

/**
 * @swagger
 * /api/enrollments/my/stats:
 *   get:
 *     tags: [Enrollments]
 *     summary: Get learning statistics summary
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/my/stats", enrollmentController.getMyStats);

module.exports = router;

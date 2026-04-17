const { Router } = require("express");
const learnerDashboardController = require("../controllers/learner-dashboard.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { learnerDashboardQueryRules } = require("../validators/learner-dashboard.validator");

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Learner Dashboard
 *     description: Aggregated data for the learner home dashboard
 */

/**
 * @swagger
 * /api/dashboard/me:
 *   get:
 *     tags: [Learner Dashboard]
 *     summary: Get learner dashboard overview
 *     description: |
 *       Returns one payload for the learner home screen, including greeting block,
 *       study-time chart, performance KPI, today's flashcard review schedule,
 *       quick stats, recent course highlight and "my courses" progress list.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TimezoneOffset'
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 7
 *           maximum: 30
 *           default: 12
 *         description: Number of days for the study-time chart.
 *       - in: query
 *         name: coursesLimit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 4
 *         description: Maximum courses returned in the `myCourses.items` list.
 *       - in: query
 *         name: reviewLimit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *         description: Maximum flashcard review groups returned for today.
 *     responses:
 *       200:
 *         description: Learner dashboard retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/me", learnerDashboardQueryRules, validate, learnerDashboardController.getMyDashboard);

module.exports = router;

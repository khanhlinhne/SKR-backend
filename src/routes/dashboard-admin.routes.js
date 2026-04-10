const { Router } = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const { validate } = require("../middlewares/validate.middleware");
const { dashboardQueryRules } = require("../validators/dashboard.validator");
const {
  skipDashboardAuthIfOpen,
  skipDashboardAuthorizeIfOpen,
} = require("../middlewares/dashboard-open.middleware");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Admin — Dashboard
 *     description: |
 *       Aggregated metrics for the admin home screen (KPI cards, 12-month revenue chart, featured courses, recent users & orders).
 *       **Testing without Bearer:** set env `ADMIN_DASHBOARD_OPEN=true` (development only).
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin — Dashboard]
 *     summary: Full dashboard payload (one request)
 *     description: |
 *       Returns summary KPIs (with `changePercent` vs the previous window of the same length),
 *       rolling 12-month revenue series (`revenueByMonth`), top courses by purchase revenue,
 *       and recent users / orders.
 *     security:
 *       - {}
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *         description: |
 *           Compares **current window** (week start / month start / year start → now) with the **immediately preceding window of equal length**
 *           for `summary.*.changePercent`. Chart data is always the last **12 calendar months** of paid orders.
 *     responses:
 *       200:
 *         description: OK
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
 *                     period: { type: string, enum: [week, month, year] }
 *                     periodBounds:
 *                       type: object
 *                       properties:
 *                         currentStartUtc: { type: string, format: date-time }
 *                         currentEndUtc: { type: string, format: date-time }
 *                         previousStartUtc: { type: string, format: date-time }
 *                         previousEndUtc: { type: string, format: date-time }
 *                     summary:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: object
 *                           properties:
 *                             total: { type: integer, description: All-time user count }
 *                             newInPeriod: { type: integer }
 *                             changePercent: { type: number, nullable: true }
 *                         courses:
 *                           type: object
 *                         orders:
 *                           type: object
 *                         revenue:
 *                           type: object
 *                           properties:
 *                             currencyCode: { type: string, example: VND }
 *                             totalInPeriod: { type: number }
 *                             changePercent: { type: number, nullable: true }
 *                     revenueByMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year: { type: integer }
 *                           month: { type: integer, description: 1–12 }
 *                           label: { type: string, example: T1, description: Position T1…T12 in the 12-month window }
 *                           amount: { type: number, description: VND (completed orders in that month) }
 *                     featuredCourses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank: { type: integer }
 *                           courseId: { type: string, format: uuid }
 *                           courseName: { type: string }
 *                           studentCount: { type: integer }
 *                           rating: { type: number, nullable: true }
 *                           revenue: { type: number }
 *                           growthPercent: { type: number, nullable: true }
 *                     recentUsers:
 *                       type: array
 *                     recentOrders:
 *                       type: array
 */
router.get(
  "/",
  skipDashboardAuthIfOpen,
  skipDashboardAuthorizeIfOpen,
  dashboardQueryRules,
  validate,
  dashboardController.getDashboard
);

module.exports = router;

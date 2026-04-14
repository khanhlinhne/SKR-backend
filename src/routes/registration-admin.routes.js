const { Router } = require("express");
const registrationController = require("../controllers/registration.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  listRegistrationsRules,
  reportRules,
  purchaseIdParamRules,
  createRegistrationRules,
  updateRegistrationRules,
} = require("../validators/registration.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Admin — Registrations
 *     description: |
 *       Quản lý đăng ký khóa học (`pmt_course_purchases` / subject purchases).
 *       List & CRUD — **admin** only. Báo cáo — **admin** hoặc **staff**.
 */

/**
 * @swagger
 * /api/admin/registrations:
 *   get:
 *     tags: [Admin — Registrations]
 *     summary: Danh sách đăng ký (phân trang, lọc, tìm kiếm)
 *     security: [ { BearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Lọc theo người dùng
 *       - in: query
 *         name: courseId
 *         schema: { type: string, format: uuid }
 *         description: Lọc theo khóa học (subject_id)
 *       - in: query
 *         name: status
 *         schema: { type: string, maxLength: 50 }
 *         description: Trạng thái bản ghi (vd. active)
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 200 }
 *         description: Tìm theo email, tên user, mã/tên khóa học
 *     responses:
 *       200:
 *         description: OK — data.items + data.pagination
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *   post:
 *     tags: [Admin — Registrations]
 *     summary: Tạo đăng ký thủ công (cấp quyền truy cập khóa)
 *     security: [ { BearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, courseId]
 *             properties:
 *               userId: { type: string, format: uuid }
 *               courseId: { type: string, format: uuid }
 *               orderId: { type: string, format: uuid, nullable: true }
 *               purchasePrice: { type: number, minimum: 0, description: Giá thanh toán ghi nhận (VND) }
 *               currencyCode: { type: string, maxLength: 3, example: VND }
 *               accessStartUtc: { type: string, format: date-time }
 *               accessEndUtc: { type: string, format: date-time, nullable: true }
 *               isLifetimeAccess: { type: boolean, default: true }
 *               purchaseType: { type: string, example: manual }
 *               status: { type: string, example: active }
 *               progressPercent: { type: number, minimum: 0, maximum: 100 }
 *               chaptersCompleted: { type: integer, minimum: 0 }
 *               lessonsCompleted: { type: integer, minimum: 0 }
 *           example:
 *             userId: "00000000-0000-0000-0000-000000000001"
 *             courseId: "00000000-0000-0000-0000-000000000002"
 *             purchasePrice: 299000
 *             currencyCode: VND
 *             status: active
 *             purchaseType: manual
 *     responses:
 *       201:
 *         description: Created
 *       400: { description: User/course not found }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       409: { description: User already registered for this course }
 */
router.get(
  "/",
  authenticate,
  authorize("admin"),
  listRegistrationsRules,
  validate,
  registrationController.list
);

/**
 * @swagger
 * /api/admin/registrations/report:
 *   get:
 *     tags: [Admin — Registrations]
 *     summary: Báo cáo tổng hợp (đăng ký + giao dịch)
 *     security: [ { BearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Bắt đầu khoảng thời gian (ISO 8601)
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: Kết thúc khoảng thời gian (ISO 8601)
 *       - in: query
 *         name: transactionLimit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *         description: Số giao dịch gần nhất trong `data.recentTransactions`
 *     responses:
 *       200:
 *         description: OK — data.summary + data.recentTransactions
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/report",
  authenticate,
  authorize("admin", "staff"),
  reportRules,
  validate,
  registrationController.getReport
);

/**
 * @swagger
 * /api/admin/registrations/{purchaseId}:
 *   get:
 *     tags: [Admin — Registrations]
 *     summary: Chi tiết một đăng ký
 *     security: [ { BearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Admin — Registrations]
 *     summary: Cập nhật đăng ký (tiến độ, trạng thái, hạn truy cập, …)
 *     security: [ { BearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId: { type: string, format: uuid, nullable: true }
 *               purchasePrice: { type: number, minimum: 0 }
 *               currencyCode: { type: string, maxLength: 3 }
 *               accessStartUtc: { type: string, format: date-time, nullable: true }
 *               accessEndUtc: { type: string, format: date-time, nullable: true }
 *               isLifetimeAccess: { type: boolean }
 *               purchaseType: { type: string }
 *               status: { type: string }
 *               progressPercent: { type: number, minimum: 0, maximum: 100 }
 *               chaptersCompleted: { type: integer, minimum: 0 }
 *               lessonsCompleted: { type: integer, minimum: 0 }
 *               lastAccessedAtUtc: { type: string, format: date-time, nullable: true }
 *               completedAtUtc: { type: string, format: date-time, nullable: true }
 *               certificateIssued: { type: boolean }
 *               certificateUrl: { type: string, nullable: true }
 *           example:
 *             progressPercent: 45.5
 *             status: active
 *             lessonsCompleted: 3
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.get(
  "/:purchaseId",
  authenticate,
  authorize("admin"),
  purchaseIdParamRules,
  validate,
  registrationController.getById
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createRegistrationRules,
  validate,
  registrationController.create
);

router.patch(
  "/:purchaseId",
  authenticate,
  authorize("admin"),
  updateRegistrationRules,
  validate,
  registrationController.update
);

module.exports = router;

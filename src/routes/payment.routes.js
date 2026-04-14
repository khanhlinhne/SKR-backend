const { Router } = require("express");
const paymentController = require("../controllers/payment.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  courseCheckoutRules,
  packageCheckoutRules,
  orderCodeParamRules,
} = require("../validators/payment.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Payment
 *     description: SePay payment checkout and webhook
 */

/**
 * @swagger
 * /api/payments/sepay/courses/{courseId}/checkout:
 *   post:
 *     tags: [Payment]
 *     summary: Create SePay checkout for course purchase
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Checkout created
 */
router.post(
  "/sepay/courses/:courseId/checkout",
  authenticate,
  courseCheckoutRules,
  validate,
  paymentController.createCourseCheckout
);

/**
 * @swagger
 * /api/payments/sepay/packages/{packageId}/checkout:
 *   post:
 *     tags: [Payment]
 *     summary: Create SePay checkout for package purchase
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Checkout created
 */
router.post(
  "/sepay/packages/:packageId/checkout",
  authenticate,
  packageCheckoutRules,
  validate,
  paymentController.createPackageCheckout
);

/**
 * @swagger
 * /api/payments/orders/{orderCode}:
 *   get:
 *     tags: [Payment]
 *     summary: Get current user's order detail and payment status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order retrieved
 */
router.get(
  "/orders/:orderCode",
  authenticate,
  orderCodeParamRules,
  validate,
  paymentController.getMyOrder
);

/**
 * @swagger
 * /api/payments/sepay/webhook:
 *   post:
 *     tags: [Payment]
 *     summary: SePay webhook callback to confirm payment
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post("/sepay/webhook", paymentController.handleSepayWebhook);

module.exports = router;

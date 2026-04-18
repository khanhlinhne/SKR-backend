const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const orderController = require('../controllers/order.controller');

const router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order and get VietQR link
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created with VietQR info
 */
router.post('/', authenticate, orderController.createOrder);

/**
 * @swagger
 * /api/orders/{orderCode}/verify:
 *   get:
 *     summary: Check order payment status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order status
 */
router.get('/:orderCode/verify', authenticate, orderController.verifyOrderStatus);

/**
 * @swagger
 * /api/orders/webhook/payos:
 *   post:
 *     summary: Webhook for PayOS payment notifications
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
router.post('/webhook/payos', orderController.handlePayOSWebhook);

module.exports = router;

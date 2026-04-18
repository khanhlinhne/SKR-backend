const orderService = require('../services/order.service');

const orderController = {
  async createOrder(req, res, next) {
    try {
      const result = await orderService.createOrder(req.user.userId, req.body);
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyOrderStatus(req, res, next) {
    try {
      const { orderCode } = req.params;
      const result = await orderService.verifyOrderStatus(req.user.userId, orderCode);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async handlePayOSWebhook(req, res, next) {
    try {
      const webhookData = req.body;
      console.log('PayOS Webhook received:', webhookData);

      // Verify the webhook signature
      // PayOS will send a data object with a signature
      // We need to use the service to handle the business logic
      await orderService.processPayOSWebhook(webhookData);

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Webhook error:', error);
      // Even if it fails, PayOS expects 200/201 or it will retry. 
      // But we should return error if it's truly bad.
      res.status(200).json({ status: 'error', message: error.message });
    }
  },
};

module.exports = orderController;

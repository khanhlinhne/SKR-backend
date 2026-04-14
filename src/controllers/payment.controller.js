const paymentService = require("../services/payment.service");
const { success } = require("../utils/response.util");

const paymentController = {
  async createCourseCheckout(req, res, next) {
    try {
      const data = await paymentService.createCourseCheckout(
        req.user?.userId,
        req.params.courseId,
        req.body
      );
      return success(res, {
        statusCode: 201,
        message: "SePay checkout created for course",
        data,
      });
    } catch (error) {
      return next(error);
    }
  },

  async createPackageCheckout(req, res, next) {
    try {
      const data = await paymentService.createPackageCheckout(
        req.user?.userId,
        req.params.packageId,
        req.body
      );
      return success(res, {
        statusCode: 201,
        message: "SePay checkout created for package",
        data,
      });
    } catch (error) {
      return next(error);
    }
  },

  async getMyOrder(req, res, next) {
    try {
      const data = await paymentService.getMyOrder(req.user?.userId, req.params.orderCode);
      return success(res, {
        message: "Order retrieved successfully",
        data,
      });
    } catch (error) {
      return next(error);
    }
  },

  async handleSepayWebhook(req, res, next) {
    try {
      const data = await paymentService.handleSepayWebhook(req);
      return success(res, {
        message: "SePay webhook processed",
        data,
      });
    } catch (error) {
      return next(error);
    }
  },
};

module.exports = paymentController;

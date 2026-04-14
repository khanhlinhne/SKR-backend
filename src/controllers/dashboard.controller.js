const dashboardService = require("../services/dashboard.service");
const { success } = require("../utils/response.util");

const dashboardController = {
  async getDashboard(req, res, next) {
    try {
      const period = req.query.period || "month";
      const data = await dashboardService.getDashboard(period);
      return success(res, { message: "Dashboard data retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;

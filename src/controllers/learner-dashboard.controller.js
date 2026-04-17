const learnerDashboardService = require("../services/learner-dashboard.service");
const { success } = require("../utils/response.util");

const learnerDashboardController = {
  async getMyDashboard(req, res, next) {
    try {
      const timezoneOffsetHeader = req.headers["x-timezone-offset"];
      const data = await learnerDashboardService.getMyDashboard(req.user?.userId, {
        ...req.query,
        timezoneOffset:
          timezoneOffsetHeader !== undefined ? timezoneOffsetHeader : req.user?.timezoneOffset,
      });

      return success(res, {
        message: "Learner dashboard retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = learnerDashboardController;

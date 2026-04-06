const enrollmentService = require("../services/enrollment.service");
const { success } = require("../utils/response.util");

const enrollmentController = {
  async getMyEnrollments(req, res, next) {
    try {
      const data = await enrollmentService.getMyEnrollments(
        req.user.userId,
        req.query
      );
      return success(res, {
        message: "Enrollments retrieved successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyStats(req, res, next) {
    try {
      const data = await enrollmentService.getMyStats(req.user.userId);
      return success(res, {
        message: "Enrollment stats retrieved successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = enrollmentController;

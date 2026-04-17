const { expertService, userIsAdmin } = require("../services/expert.service");
const { success } = require("../utils/response.util");

const expertController = {
  async getMyDashboard(req, res, next) {
    try {
      const period = req.query.period || "month";
      const data = await expertService.getMyDashboard(req.user?.userId, period);
      return success(res, { message: "Expert dashboard retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async listExperts(req, res, next) {
    try {
      const isAdmin = await userIsAdmin(req.user?.userId);
      const data = await expertService.listExperts(req.query, { isAdmin });
      return success(res, { message: "Experts retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getExpertDetail(req, res, next) {
    try {
      const isAdmin = await userIsAdmin(req.user?.userId);
      const data = await expertService.getExpertDetail(req.params.expertId, { isAdmin });
      return success(res, { message: "Expert retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createExpert(req, res, next) {
    try {
      const data = await expertService.createExpert(req.body, req.user?.userId);
      return success(res, { statusCode: 201, message: "Expert created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateExpert(req, res, next) {
    try {
      const data = await expertService.updateExpert(req.params.expertId, req.body, req.user?.userId);
      return success(res, { message: "Expert updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteExpert(req, res, next) {
    try {
      const data = await expertService.deleteExpert(req.params.expertId, req.user?.userId);
      return success(res, { message: "Expert deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = expertController;

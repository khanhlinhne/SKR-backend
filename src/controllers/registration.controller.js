const registrationService = require("../services/registration.service");
const { success } = require("../utils/response.util");

const registrationController = {
  async list(req, res, next) {
    try {
      const data = await registrationService.listForAdmin(req.query);
      return success(res, { message: "Registrations retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getReport(req, res, next) {
    try {
      const data = await registrationService.getReport(req.query);
      return success(res, { message: "Registration report retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await registrationService.getByIdForAdmin(req.params.purchaseId);
      return success(res, { message: "Registration retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await registrationService.createByAdmin(req.user.userId, req.body);
      return success(res, { message: "Registration created successfully", data, statusCode: 201 });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const data = await registrationService.updateByAdmin(req.user.userId, req.params.purchaseId, req.body);
      return success(res, { message: "Registration updated successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = registrationController;

const settingService = require("../services/setting.service");
const { success } = require("../utils/response.util");

const settingController = {
  async getSettings(req, res, next) {
    try {
      const data = await settingService.getSettings(req.query);
      return success(res, { message: "Settings retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getSettingDetail(req, res, next) {
    try {
      const data = await settingService.getSettingDetail(req.params.id);
      return success(res, { message: "Setting retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createSetting(req, res, next) {
    try {
      const data = await settingService.createSetting(req.body, req.user.userId);
      return success(res, { statusCode: 201, message: "Setting created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateSetting(req, res, next) {
    try {
      const data = await settingService.updateSetting(req.params.id, req.body, req.user.userId);
      return success(res, { message: "Setting updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteSetting(req, res, next) {
    try {
      await settingService.deleteSetting(req.params.id, req.user.userId);
      return success(res, { message: "Setting deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = settingController;

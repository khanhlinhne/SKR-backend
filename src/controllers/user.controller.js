const userService = require("../services/user.service");
const { success } = require("../utils/response.util");

const userController = {
  async getAllUsers(req, res, next) {
    try {
      const data = await userService.getAllUsers(req.query);
      return success(res, { message: "Users retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req, res, next) {
    try {
      const data = await userService.getProfile(req.user.userId);
      return success(res, { message: "Profile retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const data = await userService.updateProfile(req.user.userId, req.body);
      return success(res, { message: "Profile updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const data = await userService.changePassword(req.user.userId, req.body);
      return success(res, { message: data.message });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;

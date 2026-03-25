const packageService = require("../services/package.service");
const { success } = require("../utils/response.util");

const packageController = {
  async getPackages(req, res, next) {
    try {
      const data = await packageService.getPackages(req.query);
      return success(res, { message: "Packages retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getPackageDetail(req, res, next) {
    try {
      const data = await packageService.getPackageDetail(req.params.id);
      return success(res, { message: "Package retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createPackage(req, res, next) {
    try {
      const data = await packageService.createPackage(req.body, req.user.userId);
      return success(res, { statusCode: 201, message: "Package created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updatePackage(req, res, next) {
    try {
      const data = await packageService.updatePackage(req.params.id, req.body, req.user.userId);
      return success(res, { message: "Package updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deletePackage(req, res, next) {
    try {
      await packageService.deletePackage(req.params.id, req.user.userId);
      return success(res, { message: "Package deleted successfully" });
    } catch (err) {
      next(err);
    }
  },

  async addCourse(req, res, next) {
    try {
      const data = await packageService.addCourseToPackage(req.params.id, req.body, req.user.userId);
      return success(res, { statusCode: 201, message: "Course added to package successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async removeCourse(req, res, next) {
    try {
      const data = await packageService.removeCourseFromPackage(req.params.id, req.params.courseId, req.user.userId);
      return success(res, { message: "Course removed from package successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = packageController;

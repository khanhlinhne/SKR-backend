const uploadService = require("../services/upload.service");
const { success } = require("../utils/response.util");

const uploadController = {
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        const AppError = require("../utils/AppError");
        return next(AppError.badRequest("No image file provided"));
      }

      const data = await uploadService.uploadImage(req.file.buffer, req.file.originalname);

      return success(res, {
        statusCode: 201,
        message: "Image uploaded successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = uploadController;

const documentService = require("../services/document.service");
const { success } = require("../utils/response.util");

const documentController = {
  async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        const AppError = require("../utils/AppError");
        return next(AppError.badRequest("No document file provided"));
      }

      let tags = undefined;
      if (req.body.tags) {
        try {
          tags = typeof req.body.tags === "string" ? JSON.parse(req.body.tags) : req.body.tags;
        } catch (_) {
          tags = undefined;
        }
      }
      const data = await documentService.uploadDocument(req.user.userId, req.file, {
        documentTitle: req.body.documentTitle,
        documentDescription: req.body.documentDescription,
        lessonId: req.body.lessonId,
        subjectId: req.body.subjectId,
        visibility: req.body.visibility,
        tags,
      });

      return success(res, {
        statusCode: 201,
        message: "Learning document uploaded successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyDocuments(req, res, next) {
    try {
      const data = await documentService.getMyDocuments(req.user.userId, req.query);
      return success(res, { message: "Documents retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getDocumentById(req, res, next) {
    try {
      const data = await documentService.getDocumentById(req.params.id, req.user.userId);
      return success(res, { message: "Document retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = documentController;

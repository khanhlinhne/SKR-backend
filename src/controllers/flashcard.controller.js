const flashcardService = require("../services/flashcard.service");
const { success } = require("../utils/response.util");

const flashcardController = {
  async getPublicSets(req, res, next) {
    try {
      const data = await flashcardService.getPublicSets(req.query);
      return success(res, { message: "Public flashcard sets retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getPublicSetById(req, res, next) {
    try {
      const data = await flashcardService.getPublicSetById(req.params.id, req.user?.userId);
      return success(res, { message: "Public flashcard set retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getMySets(req, res, next) {
    try {
      const data = await flashcardService.getMySets(req.user?.userId, req.query);
      return success(res, { message: "Flashcard sets retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getSetById(req, res, next) {
    try {
      const data = await flashcardService.getSetById(req.params.id, req.user?.userId);
      return success(res, { message: "Flashcard set retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createSet(req, res, next) {
    try {
      const data = await flashcardService.createSet(req.user?.userId, req.body);
      return success(res, { statusCode: 201, message: "Flashcard set created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateSet(req, res, next) {
    try {
      const data = await flashcardService.updateSet(req.params.id, req.user?.userId, req.body);
      return success(res, { message: "Flashcard set updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteSet(req, res, next) {
    try {
      const data = await flashcardService.deleteSet(req.params.id, req.user?.userId);
      return success(res, { message: "Flashcard set deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getItems(req, res, next) {
    try {
      const data = await flashcardService.getItems(req.params.setId, req.user?.userId);
      return success(res, { message: "Flashcard items retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async startStudySession(req, res, next) {
    try {
      const data = await flashcardService.startStudySession(req.params.setId, req.user?.userId);
      return success(res, { statusCode: 201, message: "Flashcard study session started successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async submitStudyReview(req, res, next) {
    try {
      const data = await flashcardService.submitStudyReview(
        req.params.setId,
        req.params.sessionId,
        req.user?.userId,
        req.body
      );
      return success(res, { message: "Flashcard progress saved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async submitStudyReviewBatch(req, res, next) {
    try {
      const data = await flashcardService.submitStudyReviewBatch(
        req.params.setId,
        req.params.sessionId,
        req.user?.userId,
        req.body
      );
      return success(res, { message: "Flashcard batch progress saved successfully", data });
    } catch (err) {
      next(err);
    }
  },
  async completeStudySession(req, res, next) {
    try {
      const data = await flashcardService.completeStudySession(
        req.params.setId,
        req.params.sessionId,
        req.user?.userId,
        req.body
      );
      return success(res, { message: "Flashcard study session completed successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createItem(req, res, next) {
    try {
      const data = await flashcardService.createItem(
        req.params.setId,
        req.user?.userId,
        req.body
      );
      return success(res, { statusCode: 201, message: "Flashcard item created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateItem(req, res, next) {
    try {
      const data = await flashcardService.updateItem(
        req.params.setId,
        req.params.itemId,
        req.user?.userId,
        req.body
      );
      return success(res, { message: "Flashcard item updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteItem(req, res, next) {
    try {
      const data = await flashcardService.deleteItem(
        req.params.setId,
        req.params.itemId,
        req.user?.userId
      );
      return success(res, { message: "Flashcard item deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = flashcardController;

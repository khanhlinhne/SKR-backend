const migrationService = require("../services/migration.service");
const { success } = require("../utils/response.util");

const migrationController = {
  async seedCourses(_req, res, next) {
    try {
      const data = await migrationService.seedCourses();
      return success(res, { message: "Course migration completed successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async seedFlashcards(_req, res, next) {
    try {
      const data = await migrationService.seedFlashcards();
      return success(res, { message: "Flashcard migration completed successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async seedPackages(_req, res, next) {
    try {
      const data = await migrationService.seedPackages();
      return success(res, { message: "Package migration completed successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async seedSettings(_req, res, next) {
    try {
      const data = await migrationService.seedSettings();
      return success(res, { message: "Settings migration completed successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = migrationController;

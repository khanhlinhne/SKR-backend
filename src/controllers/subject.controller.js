const subjectService = require("../services/subject.service");
const { success } = require("../utils/response.util");

const subjectController = {
  async getSubjects(req, res, next) {
    try {
      const data = await subjectService.getSubjects(req.query);
      return success(res, { message: "Subjects retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getSubjectDetail(req, res, next) {
    try {
      const data = await subjectService.getSubjectDetail(req.params.id);
      return success(res, { message: "Subject retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = subjectController;

const courseService = require("../services/course.service");
const { success } = require("../utils/response.util");

const courseController = {
  // ──────────────── COURSES ────────────────

  async getCourses(req, res, next) {
    try {
      const data = await courseService.getCourses(req.query);
      return success(res, { message: "Courses retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getCourseDetail(req, res, next) {
    try {
      const data = await courseService.getCourseDetail(req.params.id);
      return success(res, { message: "Course retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createCourse(req, res, next) {
    try {
      const data = await courseService.createCourse(req.user?.userId, req.body);
      return success(res, { statusCode: 201, message: "Course created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateCourse(req, res, next) {
    try {
      const data = await courseService.updateCourse(req.params.id, req.user?.userId, req.user?.roles, req.body);
      return success(res, { message: "Course updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteCourse(req, res, next) {
    try {
      const data = await courseService.deleteCourse(req.params.id, req.user?.userId, req.user?.roles);
      return success(res, { message: "Course deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  // ──────────────── CHAPTERS ────────────────

  async getChapters(req, res, next) {
    try {
      const data = await courseService.getChapters(req.params.courseId);
      return success(res, { message: "Chapters retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createChapter(req, res, next) {
    try {
      const data = await courseService.createChapter(req.params.courseId, req.user?.userId, req.body);
      return success(res, { statusCode: 201, message: "Chapter created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateChapter(req, res, next) {
    try {
      const data = await courseService.updateChapter(
        req.params.courseId,
        req.params.chapterId,
        req.user?.userId,
        req.body
      );
      return success(res, { message: "Chapter updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteChapter(req, res, next) {
    try {
      const data = await courseService.deleteChapter(
        req.params.courseId,
        req.params.chapterId,
        req.user?.userId
      );
      return success(res, { message: "Chapter deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  // ──────────────── LESSONS ────────────────

  async getLessons(req, res, next) {
    try {
      const data = await courseService.getLessons(req.params.courseId, req.params.chapterId);
      return success(res, { message: "Lessons retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async createLesson(req, res, next) {
    try {
      const data = await courseService.createLesson(
        req.params.courseId,
        req.params.chapterId,
        req.user?.userId,
        req.body
      );
      return success(res, { statusCode: 201, message: "Lesson created successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateLesson(req, res, next) {
    try {
      const data = await courseService.updateLesson(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.user?.userId,
        req.body
      );
      return success(res, { message: "Lesson updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteLesson(req, res, next) {
    try {
      const data = await courseService.deleteLesson(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.user?.userId
      );
      return success(res, { message: "Lesson deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = courseController;

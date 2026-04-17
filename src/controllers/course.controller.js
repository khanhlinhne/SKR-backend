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

  // ──────────────── LESSON CONTENT ────────────────

  async getLessonContent(req, res, next) {
    try {
      const data = await courseService.getLessonContent(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId
      );
      return success(res, { message: "Lesson content retrieved successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async addVideo(req, res, next) {
    try {
      const data = await courseService.addVideo(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.user?.userId,
        req.body
      );
      return success(res, { statusCode: 201, message: "Video added successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteVideo(req, res, next) {
    try {
      const data = await courseService.deleteVideo(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.params.videoId,
        req.user?.userId
      );
      return success(res, { message: "Video deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async addDocument(req, res, next) {
    try {
      const uploadedFile = req.files?.file?.[0] || req.files?.document?.[0] || null;
      const data = await courseService.addDocument(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.user?.userId,
        uploadedFile,
        req.body
      );
      return success(res, { statusCode: 201, message: "Document added successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteDocument(req, res, next) {
    try {
      const data = await courseService.deleteDocument(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.params.documentId,
        req.user?.userId
      );
      return success(res, { message: "Document deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async addQuestion(req, res, next) {
    try {
      const data = await courseService.addQuestion(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.user?.userId,
        req.body
      );
      return success(res, { statusCode: 201, message: "Question added successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async updateQuestion(req, res, next) {
    try {
      const data = await courseService.updateQuestion(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.params.questionId,
        req.user?.userId,
        req.body
      );
      return success(res, { message: "Question updated successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async deleteQuestion(req, res, next) {
    try {
      const data = await courseService.deleteQuestion(
        req.params.courseId,
        req.params.chapterId,
        req.params.lessonId,
        req.params.questionId,
        req.user?.userId
      );
      return success(res, { message: "Question deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  // ──────────────── ASSIGN EXPERT ────────────────

  async assignExpert(req, res, next) {
    try {
      const data = await courseService.assignExpert(
        req.params.id,
        req.body.expertId,
        req.user?.userId
      );
      return success(res, { message: "Expert assigned successfully", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = courseController;

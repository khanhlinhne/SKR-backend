const quizService = require("../services/quiz.service");
const quizDto = require("../dtos/quiz.dto");
const { success } = require("../utils/response.util");

const quizController = {
  async getMyQuizPractices(req, res, next) {
    try {
      const data = await quizService.getMyQuizPractices(req.user.userId, req.query);
      return success(res, { message: "Quiz practices retrieved successfully", data: { ...data, items: data.items.map(quizDto.toPracticeItem) } });
    } catch (err) {
      next(err);
    }
  },

  async createQuizPractice(req, res, next) {
    try {
      const created = await quizService.createQuizPractice(req.user.userId, req.body);
      return success(res, { statusCode: 201, message: "Quiz practice created successfully", data: quizDto.toPracticeItem(created) });
    } catch (err) {
      next(err);
    }
  },

  async getQuizPracticeDetail(req, res, next) {
    try {
      const practice = await quizService.getQuizPracticeDetail(req.user.userId, req.params.practiceTestId);
      return success(res, { message: "Quiz practice retrieved successfully", data: quizDto.toPracticeItem(practice) });
    } catch (err) {
      next(err);
    }
  },

  async updateQuizPractice(req, res, next) {
    try {
      const updated = await quizService.updateQuizPractice(req.user.userId, req.params.practiceTestId, req.body);
      return success(res, { message: "Quiz practice updated successfully", data: quizDto.toPracticeItem(updated) });
    } catch (err) {
      next(err);
    }
  },

  async deleteQuizPractice(req, res, next) {
    try {
      const data = await quizService.deleteQuizPractice(req.user.userId, req.params.practiceTestId);
      return success(res, { message: "Quiz practice deleted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  async getMyQuizAttempts(req, res, next) {
    try {
      const data = await quizService.getMyQuizAttempts(req.user.userId, req.query);
      return success(res, {
        message: "Quiz attempts retrieved successfully",
        data: { ...data, items: data.items.map(quizDto.toAttemptListItem) },
      });
    } catch (err) {
      next(err);
    }
  },

  async startQuizAttempt(req, res, next) {
    try {
      const { attempt, questions } = await quizService.startQuizAttempt(req.user.userId, req.params.practiceTestId, req.body);
      const answersByQuestionId = new Map(); // not needed for handling response
      return success(res, {
        statusCode: 201,
        message: "Quiz attempt started successfully",
        data: {
          attempt: {
            ...quizDto.toAttemptDetail(attempt, questions, answersByQuestionId, { showCorrectAnswers: false }),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getQuizAttempt(req, res, next) {
    try {
      const { attempt, questions, answersByQuestionId, showCorrectAnswers } = await quizService.getQuizAttempt(req.user.userId, req.params.attemptId);
      return success(res, { message: "Quiz attempt retrieved successfully", data: quizDto.toAttemptDetail(attempt, questions, answersByQuestionId, { showCorrectAnswers }) });
    } catch (err) {
      next(err);
    }
  },

  async submitQuizAttempt(req, res, next) {
    try {
      const { attempt, totalPointsPossible } = await quizService.submitQuizAttempt(req.user.userId, req.params.attemptId, req.body);
      return success(res, {
        message: "Quiz submitted successfully",
        data: quizDto.toQuizResult(attempt, { totalPointsPossible }),
      });
    } catch (err) {
      next(err);
    }
  },

  async getQuizAttemptResult(req, res, next) {
    try {
      const result = await quizService.getQuizAttemptResult(req.user.userId, req.params.attemptId);
      const dto = quizDto.toQuizResult(result.attempt, {
        totalPointsPossible: result.totalPointsPossible,
        scoreAchieved: result.scoreAchieved,
        percentageScore: result.percentageScore,
        isPassed: result.isPassed,
      });
      return success(res, { message: "Quiz result retrieved successfully", data: dto });
    } catch (err) {
      next(err);
    }
  },

  async reviewQuizAttempt(req, res, next) {
    try {
      const data = await quizService.reviewQuizAttempt(req.user.userId, req.params.attemptId);
      return success(res, {
        message: "Quiz review retrieved successfully",
        data: quizDto.toQuizReview(data.attempt, data.practice, data.questions, data.answersByQuestionId, data.correctOptionsByQuestionId),
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = quizController;


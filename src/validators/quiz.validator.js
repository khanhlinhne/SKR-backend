const { body, param, query } = require("express-validator");

const DIFFICULTY_LEVELS = ["easy", "medium", "hard", "expert"];
const QUESTION_TYPES = ["multiple_choice", "true_false", "essay", "short_answer", "fill_in_blank"];

const getQuizPracticesRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
  query("search").optional().trim().isLength({ max: 255 }).withMessage("search must not exceed 255 characters"),
  query("status").optional().trim().isIn(["active", "deleted"]).withMessage("status must be active or deleted"),
];

const quizPracticeIdParamRules = [param("practiceTestId").isUUID().withMessage("practiceTestId must be a valid UUID")];

const createQuizPracticeRules = [
  body("testTitle").trim().notEmpty().withMessage("testTitle is required").isLength({ max: 255 }).withMessage("testTitle must not exceed 255 characters"),
  body("testDescription").optional().trim().isLength({ max: 2000 }).withMessage("testDescription must not exceed 2000 characters"),
  body("aiGenerationId").optional().isUUID().withMessage("aiGenerationId must be a valid UUID"),
  body("manualQuestions")
    .optional()
    .isArray({ min: 1, max: 100 })
    .withMessage("manualQuestions must be an array with 1-100 items"),
  body("manualQuestions.*.questionText")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("manualQuestions.questionText is required")
    .isLength({ max: 5000 })
    .withMessage("manualQuestions.questionText must not exceed 5000 characters"),
  body("manualQuestions.*.questionType")
    .optional()
    .isIn(QUESTION_TYPES)
    .withMessage(`manualQuestions.questionType must be one of: ${QUESTION_TYPES.join(", ")}`),
  body("manualQuestions.*.questionExplanation")
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage("manualQuestions.questionExplanation must not exceed 5000 characters"),
  body("manualQuestions.*.difficultyLevel")
    .optional()
    .isIn(DIFFICULTY_LEVELS)
    .withMessage(`manualQuestions.difficultyLevel must be one of: ${DIFFICULTY_LEVELS.join(", ")}`),
  body("manualQuestions.*.points")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("manualQuestions.points must be greater than 0"),
  body("manualQuestions.*.timeLimitSeconds")
    .optional()
    .isInt({ min: 1 })
    .withMessage("manualQuestions.timeLimitSeconds must be a positive integer"),
  body("manualQuestions.*.correctAnswers")
    .optional()
    .isArray({ min: 1, max: 20 })
    .withMessage("manualQuestions.correctAnswers must be an array"),
  body("manualQuestions.*.correctAnswers.*")
    .optional()
    .isString()
    .withMessage("manualQuestions.correctAnswers items must be strings")
    .isLength({ max: 1000 })
    .withMessage("manualQuestions.correctAnswers items must not exceed 1000 characters"),
  body("manualQuestions.*.options")
    .optional()
    .isArray({ min: 1, max: 20 })
    .withMessage("manualQuestions.options must be an array"),
  body("manualQuestions.*.options.*.optionText")
    .optional()
    .isString()
    .withMessage("manualQuestions.options.optionText must be a string")
    .isLength({ max: 1000 })
    .withMessage("manualQuestions.options.optionText must not exceed 1000 characters"),
  body("manualQuestions.*.options.*.isCorrect")
    .optional()
    .isBoolean()
    .withMessage("manualQuestions.options.isCorrect must be a boolean"),
  body("manualQuestions.*.options.*.optionOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("manualQuestions.options.optionOrder must be a non-negative integer"),
  body("manualQuestions.*.options.*.optionExplanation")
    .optional()
    .isString()
    .withMessage("manualQuestions.options.optionExplanation must be a string")
    .isLength({ max: 5000 })
    .withMessage("manualQuestions.options.optionExplanation must not exceed 5000 characters"),
  body("courseIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("courseIds must be an array with at least 1 item")
    .bail()
    .custom((arr) => arr.every((v) => typeof v === "string" && v.trim() && /^[0-9a-fA-F-]{36}$/.test(v)))
    .withMessage("courseIds must contain UUID strings"),
  body("difficultyLevels")
    .optional()
    .isArray()
    .withMessage("difficultyLevels must be an array")
    .bail()
    .custom((arr) => arr.every((v) => DIFFICULTY_LEVELS.includes(v)))
    .withMessage(`difficultyLevels items must be one of: ${DIFFICULTY_LEVELS.join(", ")}`),
  body("questionTypes")
    .optional()
    .isArray({ min: 1 })
    .withMessage("questionTypes must be an array")
    .bail()
    .custom((arr) => arr.every((v) => QUESTION_TYPES.includes(v)))
    .withMessage(`questionTypes items must be one of: ${QUESTION_TYPES.join(", ")}`),
  body("totalQuestions").optional().isInt({ min: 1 }).withMessage("totalQuestions must be a positive integer"),
  body("timeLimitMinutes").optional().isInt({ min: 1 }).withMessage("timeLimitMinutes must be a positive integer"),
  body("randomizeQuestions").optional().isBoolean().withMessage("randomizeQuestions must be a boolean"),
  body("randomizeOptions").optional().isBoolean().withMessage("randomizeOptions must be a boolean"),
  body("showCorrectAnswers").optional().isBoolean().withMessage("showCorrectAnswers must be a boolean"),
];

const updateQuizPracticeRules = [
  body("testTitle")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("testTitle cannot be empty")
    .isLength({ max: 255 })
    .withMessage("testTitle must not exceed 255 characters"),
  body("testDescription").optional().trim().isLength({ max: 2000 }).withMessage("testDescription must not exceed 2000 characters"),
  body("courseIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("courseIds must be an array with at least 1 item")
    .bail()
    .custom((arr) => arr.every((v) => typeof v === "string" && v.trim() && /^[0-9a-fA-F-]{36}$/.test(v)))
    .withMessage("courseIds must contain UUID strings"),
  body("difficultyLevels")
    .optional()
    .isArray()
    .withMessage("difficultyLevels must be an array")
    .bail()
    .custom((arr) => arr.every((v) => DIFFICULTY_LEVELS.includes(v)))
    .withMessage(`difficultyLevels items must be one of: ${DIFFICULTY_LEVELS.join(", ")}`),
  body("questionTypes")
    .optional()
    .isArray({ min: 1 })
    .withMessage("questionTypes must be an array")
    .bail()
    .custom((arr) => arr.every((v) => QUESTION_TYPES.includes(v)))
    .withMessage(`questionTypes items must be one of: ${QUESTION_TYPES.join(", ")}`),
  body("totalQuestions").optional().isInt({ min: 1 }).withMessage("totalQuestions must be a positive integer"),
  body("timeLimitMinutes").optional().isInt({ min: 1 }).withMessage("timeLimitMinutes must be a positive integer"),
  body("randomizeQuestions").optional().isBoolean().withMessage("randomizeQuestions must be a boolean"),
  body("randomizeOptions").optional().isBoolean().withMessage("randomizeOptions must be a boolean"),
  body("showCorrectAnswers").optional().isBoolean().withMessage("showCorrectAnswers must be a boolean"),
  body("status").optional().isIn(["active", "deleted"]).withMessage("status must be active or deleted"),
];

const startQuizAttemptRules = [
  body("passingScore").optional().isDecimal({ decimal_digits: "0,2" }).withMessage("passingScore must be a valid decimal"),
];

const getQuizAttemptsRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
  query("status").optional().isIn(["not_started", "in_progress", "submitted", "graded", "expired"]).withMessage("Invalid status"),
  query("practiceTestId").optional().isUUID().withMessage("practiceTestId must be a valid UUID"),
];

const quizAttemptIdParamRules = [param("attemptId").isUUID().withMessage("attemptId must be a valid UUID")];

const submitQuizAttemptRules = [
  body("answers").isArray({ min: 1 }).withMessage("answers must be an array with at least 1 item"),
  body("answers.*.questionId").isUUID().withMessage("answers.questionId must be a valid UUID"),
  body("answers.*.selectedOptionIds")
    .optional()
    .isArray()
    .withMessage("answers.selectedOptionIds must be an array"),
  body("answers.*.selectedOptionIds.*")
    .optional()
    .isUUID()
    .withMessage("answers.selectedOptionIds items must be UUIDs"),
  body("answers.*.answerText")
    .optional()
    .isString()
    .withMessage("answers.answerText must be a string")
    .isLength({ max: 5000 })
    .withMessage("answers.answerText must not exceed 5000 characters"),
];

module.exports = {
  getQuizPracticesRules,
  quizPracticeIdParamRules,
  createQuizPracticeRules,
  updateQuizPracticeRules,
  startQuizAttemptRules,
  getQuizAttemptsRules,
  quizAttemptIdParamRules,
  submitQuizAttemptRules,
};


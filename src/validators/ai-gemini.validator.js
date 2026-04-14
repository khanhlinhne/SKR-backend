const { body, param, query } = require("express-validator");

const generateQuestionsRules = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("content is required")
    .isLength({ max: 50000 })
    .withMessage("content is too long"),
  body("questionCount")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("questionCount must be between 1 and 20"),
  body("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("difficulty must be easy, medium or hard"),
  body("language")
    .optional()
    .isIn(["vi", "en"])
    .withMessage("language must be vi or en"),
];

const refineQuestionsRules = [
  body("generationId")
    .optional()
    .isUUID()
    .withMessage("generationId must be a valid UUID"),
  body("questions")
    .exists()
    .withMessage(
      "questions is required — send JSON array from POST /generate-questions response: data.questions"
    )
    .bail()
    .isArray({ min: 1, max: 30 })
    .withMessage("questions must be a non-empty array (max 30 items)"),
  body("reviewNotes")
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage("reviewNotes too long"),
  body("language")
    .optional()
    .isIn(["vi", "en"])
    .withMessage("language must be vi or en"),
];

const explainQuestionRules = [
  body("questionText")
    .exists()
    .withMessage(
      "questionText is required — the question stem (e.g. text of the MCQ) as a string in JSON body"
    )
    .bail()
    .trim()
    .notEmpty()
    .withMessage("questionText cannot be empty")
    .isLength({ max: 10000 }),
  body("options")
    .optional()
    .isArray({ max: 20 })
    .withMessage("options must be an array"),
  body("correctAnswerSummary")
    .optional()
    .isString()
    .isLength({ max: 5000 }),
  body("userAnswerSummary")
    .optional()
    .isString()
    .isLength({ max: 5000 }),
  body("context")
    .optional()
    .isString()
    .isLength({ max: 10000 }),
  body("language")
    .optional()
    .isIn(["vi", "en"])
    .withMessage("language must be vi or en"),
];

const listGenerationsRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("userId")
    .optional()
    .isUUID()
    .withMessage("userId must be a valid UUID"),
  query("status")
    .optional()
    .isIn(["queued", "processing", "completed", "failed", "cancelled"])
    .withMessage("Invalid status filter"),
];

const getGenerationByIdRules = [
  param("generationId")
    .isUUID()
    .withMessage("generationId must be a valid UUID"),
];

module.exports = {
  generateQuestionsRules,
  refineQuestionsRules,
  explainQuestionRules,
  listGenerationsRules,
  getGenerationByIdRules,
};

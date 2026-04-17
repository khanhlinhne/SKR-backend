const { body, param, query } = require("express-validator");

const getExpertsRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("search").optional().trim().isLength({ max: 255 }).withMessage("search must not exceed 255 characters"),
  query("includeInactive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("includeInactive must be true or false"),
];

const expertIdParamRules = [param("expertId").isUUID().withMessage("expertId must be a valid UUID")];

const createExpertRules = [
  body("userId").isUUID().withMessage("userId must be a valid UUID"),
  body("headline").optional().trim().isLength({ max: 255 }).withMessage("headline must not exceed 255 characters"),
  body("expertiseSummary").optional().trim().isLength({ max: 5000 }).withMessage("expertiseSummary must not exceed 5000 characters"),
  body("subjectCourseIds")
    .optional()
    .isArray()
    .withMessage("subjectCourseIds must be an array")
    .bail()
    .custom((arr) => !arr.length || arr.every((id) => typeof id === "string" && /^[0-9a-fA-F-]{36}$/.test(id)))
    .withMessage("subjectCourseIds must be UUID strings"),
  body("displayOrder").optional().isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("assignCreatorRole").optional().isBoolean().withMessage("assignCreatorRole must be a boolean"),
];

const updateExpertRules = [
  body("headline").optional().trim().isLength({ max: 255 }).withMessage("headline must not exceed 255 characters"),
  body("expertiseSummary").optional().trim().isLength({ max: 5000 }).withMessage("expertiseSummary must not exceed 5000 characters"),
  body("subjectCourseIds")
    .optional()
    .isArray()
    .withMessage("subjectCourseIds must be an array")
    .bail()
    .custom((arr) => !arr.length || arr.every((id) => typeof id === "string" && /^[0-9a-fA-F-]{36}$/.test(id)))
    .withMessage("subjectCourseIds must be UUID strings"),
  body("displayOrder").optional().isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("status").optional().isIn(["active", "inactive"]).withMessage("status must be active or inactive"),
];

module.exports = {
  getExpertsRules,
  expertIdParamRules,
  createExpertRules,
  updateExpertRules,
};

const { param, query } = require("express-validator");

const PERIOD_OPTIONS = ["week", "month"];
const STATUS_OPTIONS = ["all", "active", "completed", "expired", "pending"];
const SORT_FIELDS = ["date", "cost", "name", "id"];

const courseIdParamRules = [param("courseId").isUUID().withMessage("courseId must be a valid UUID")];

const analyticsQueryRules = [
  query("chartPeriod")
    .optional()
    .isIn(PERIOD_OPTIONS)
    .withMessage(`chartPeriod must be one of: ${PERIOD_OPTIONS.join(", ")}`),
  query("timezone")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("timezone must be a non-empty IANA timezone string"),
  query("from")
    .optional()
    .isISO8601()
    .withMessage("from must be a valid ISO 8601 datetime"),
  query("to")
    .optional()
    .isISO8601()
    .withMessage("to must be a valid ISO 8601 datetime"),
];

const enrollmentListQueryRules = [
  ...courseIdParamRules,
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("search must not exceed 255 characters"),
  query("status")
    .optional()
    .isIn(STATUS_OPTIONS)
    .withMessage(`status must be one of: ${STATUS_OPTIONS.join(", ")}`),
  query("sortField")
    .optional()
    .isIn(SORT_FIELDS)
    .withMessage(`sortField must be one of: ${SORT_FIELDS.join(", ")}`),
  query("sortDirection")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortDirection must be asc or desc"),
];

const enrollmentExportQueryRules = [
  ...enrollmentListQueryRules,
  query("format").exists().equals("csv").withMessage("format must be csv"),
];

module.exports = {
  courseIdParamRules,
  analyticsQueryRules,
  enrollmentListQueryRules,
  enrollmentExportQueryRules,
};

const { body, param, query } = require("express-validator");

const listRegistrationsRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be 1–100"),
  query("userId").optional().isUUID().withMessage("userId must be a valid UUID"),
  query("courseId").optional().isUUID().withMessage("courseId must be a valid UUID"),
  query("status").optional().isString().isLength({ max: 50 }),
  query("search").optional().isString().isLength({ max: 200 }),
];

const reportRules = [
  query("from").optional().isISO8601().withMessage("from must be ISO 8601 date"),
  query("to").optional().isISO8601().withMessage("to must be ISO 8601 date"),
  query("transactionLimit").optional().isInt({ min: 1, max: 100 }),
];

const purchaseIdParamRules = [
  param("purchaseId").isUUID().withMessage("purchaseId must be a valid UUID"),
];

const createRegistrationRules = [
  body("userId").isUUID().withMessage("userId is required and must be a valid UUID"),
  body("courseId").isUUID().withMessage("courseId is required and must be a valid UUID"),
  body("orderId").optional({ values: "null" }).isUUID(),
  body("purchasePrice").optional().isFloat({ min: 0 }),
  body("currencyCode").optional().isString().isLength({ max: 3 }),
  body("accessStartUtc").optional().isISO8601(),
  body("accessEndUtc").optional({ values: "null" }).isISO8601(),
  body("isLifetimeAccess").optional().isBoolean(),
  body("purchaseType").optional().isString().isLength({ max: 50 }),
  body("status").optional().isString().isLength({ max: 50 }),
  body("progressPercent").optional().isFloat({ min: 0, max: 100 }),
  body("chaptersCompleted").optional().isInt({ min: 0 }),
  body("lessonsCompleted").optional().isInt({ min: 0 }),
];

const updateRegistrationRules = [
  ...purchaseIdParamRules,
  body("orderId").optional({ values: "null" }).isUUID(),
  body("purchasePrice").optional().isFloat({ min: 0 }),
  body("currencyCode").optional().isString().isLength({ max: 3 }),
  body("accessStartUtc").optional({ values: "null" }).isISO8601(),
  body("accessEndUtc").optional({ values: "null" }).isISO8601(),
  body("isLifetimeAccess").optional().isBoolean(),
  body("purchaseType").optional().isString().isLength({ max: 50 }),
  body("status").optional().isString().isLength({ max: 50 }),
  body("progressPercent").optional().isFloat({ min: 0, max: 100 }),
  body("chaptersCompleted").optional().isInt({ min: 0 }),
  body("lessonsCompleted").optional().isInt({ min: 0 }),
  body("lastAccessedAtUtc").optional({ values: "null" }).isISO8601(),
  body("completedAtUtc").optional({ values: "null" }).isISO8601(),
  body("certificateIssued").optional().isBoolean(),
  body("certificateUrl").optional({ values: "null" }).isString().isLength({ max: 2000 }),
];

module.exports = {
  listRegistrationsRules,
  reportRules,
  purchaseIdParamRules,
  createRegistrationRules,
  updateRegistrationRules,
};

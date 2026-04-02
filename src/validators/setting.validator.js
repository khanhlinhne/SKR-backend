const { query, param, body } = require("express-validator");

const getSettingsRules = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("Search must not exceed 255 characters"),
  query("group")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Group must not exceed 50 characters"),
  query("isPublic")
    .optional()
    .isIn(["true", "false"]).withMessage("isPublic must be true or false"),
];

const getSettingDetailRules = [
  param("id")
    .isUUID().withMessage("Setting ID must be a valid UUID"),
];

const createSettingRules = [
  body("settingKey")
    .trim()
    .notEmpty().withMessage("Setting key is required")
    .isLength({ max: 100 }).withMessage("Setting key must not exceed 100 characters")
    .matches(/^[a-z][a-z0-9_.]*$/).withMessage("Setting key must be lowercase with dots/underscores (e.g. site.name)"),
  body("settingValue")
    .optional({ values: "null" }),
  body("settingType")
    .optional()
    .isIn(["string", "number", "boolean", "json"]).withMessage("Setting type must be string, number, boolean or json"),
  body("settingGroup")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Setting group must not exceed 50 characters"),
  body("settingLabel")
    .trim()
    .notEmpty().withMessage("Setting label is required")
    .isLength({ max: 255 }).withMessage("Setting label must not exceed 255 characters"),
  body("settingDescription")
    .optional({ values: "null" })
    .trim(),
  body("isPublic")
    .optional()
    .isBoolean().withMessage("isPublic must be a boolean"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
];

const updateSettingRules = [
  param("id")
    .isUUID().withMessage("Setting ID must be a valid UUID"),
  body("settingValue")
    .optional({ values: "null" }),
  body("settingType")
    .optional()
    .isIn(["string", "number", "boolean", "json"]).withMessage("Setting type must be string, number, boolean or json"),
  body("settingGroup")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Setting group must not exceed 50 characters"),
  body("settingLabel")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("Setting label must not exceed 255 characters"),
  body("settingDescription")
    .optional({ values: "null" })
    .trim(),
  body("isPublic")
    .optional()
    .isBoolean().withMessage("isPublic must be a boolean"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
];

const deleteSettingRules = [
  param("id")
    .isUUID().withMessage("Setting ID must be a valid UUID"),
];

module.exports = {
  getSettingsRules,
  getSettingDetailRules,
  createSettingRules,
  updateSettingRules,
  deleteSettingRules,
};

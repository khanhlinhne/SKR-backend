const { body, param } = require("express-validator");

const courseCheckoutRules = [
  param("courseId").isUUID().withMessage("courseId must be a valid UUID"),
  body("description")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("description must be a string up to 500 characters"),
  body("orderNotes")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("orderNotes must be a string up to 1000 characters"),
];

const packageCheckoutRules = [
  param("packageId").isUUID().withMessage("packageId must be a valid UUID"),
  body("description")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("description must be a string up to 500 characters"),
  body("orderNotes")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("orderNotes must be a string up to 1000 characters"),
];

const orderCodeParamRules = [
  param("orderCode")
    .notEmpty()
    .withMessage("orderCode is required")
    .isLength({ min: 6, max: 100 })
    .withMessage("orderCode length is invalid"),
];

module.exports = {
  courseCheckoutRules,
  packageCheckoutRules,
  orderCodeParamRules,
};

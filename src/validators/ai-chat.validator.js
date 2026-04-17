const { body } = require("express-validator");

const chatRules = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("message is required")
    .isLength({ max: 2000 })
    .withMessage("message is too long"),
  body("messages")
    .optional()
    .isArray({ max: 12 })
    .withMessage("messages must be an array with at most 12 items"),
  body("messages.*.role")
    .optional()
    .isIn(["user", "assistant"])
    .withMessage("messages role must be user or assistant"),
  body("messages.*.content")
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage("messages content is too long"),
  body("language")
    .optional()
    .isIn(["vi", "en"])
    .withMessage("language must be vi or en"),
  body("includeContext")
    .optional()
    .isBoolean()
    .withMessage("includeContext must be a boolean"),
];

module.exports = {
  chatRules,
};

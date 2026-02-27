const { body, query } = require("express-validator");

const updateProfileRules = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage("Username must be 3-50 characters")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers and underscores"),
  body("fullName")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("Full name must not exceed 255 characters"),
  body("phoneNumber")
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]{7,20}$/).withMessage("Invalid phone number format"),
  body("dateOfBirth")
    .optional()
    .isISO8601().withMessage("Date of birth must be a valid date (YYYY-MM-DD)")
    .toDate(),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Bio must not exceed 500 characters"),
  body("avatarUrl")
    .optional()
    .trim()
    .isURL().withMessage("Avatar URL must be a valid URL"),
  body("timezoneOffset")
    .optional()
    .isInt({ min: -12, max: 14 }).withMessage("Timezone offset must be between -12 and 14"),
];

const changePasswordRules = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];

const getAllUsersRules = [
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
  query("isActive")
    .optional()
    .isIn(["true", "false"]).withMessage("isActive must be true or false"),
  query("emailVerified")
    .optional()
    .isIn(["true", "false"]).withMessage("emailVerified must be true or false"),
  query("role")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Role must not exceed 50 characters"),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "email", "fullName", "username", "lastLoginAt"])
    .withMessage("Invalid sortBy field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
];

module.exports = {
  updateProfileRules,
  changePasswordRules,
  getAllUsersRules,
};

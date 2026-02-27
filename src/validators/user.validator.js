const { body } = require("express-validator");

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

module.exports = {
  updateProfileRules,
  changePasswordRules,
};

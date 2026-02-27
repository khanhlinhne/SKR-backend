const { body } = require("express-validator");

const registerRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3, max: 50 }).withMessage("Username must be 3-50 characters")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers and underscores"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("timezoneOffset")
    .optional()
    .isInt({ min: -12, max: 14 }).withMessage("Timezone offset must be between -12 and 14"),
];

const verifyEmailRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
  body("otp")
    .trim()
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits")
    .isNumeric().withMessage("OTP must contain only digits"),
];

const resendOtpRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
];

const loginRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required"),
];

const refreshTokenRules = [
  body("refreshToken")
    .trim()
    .notEmpty().withMessage("Refresh token is required"),
];

const logoutRules = [
  body("refreshToken")
    .trim()
    .notEmpty().withMessage("Refresh token is required"),
];

const forgotPasswordRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
];

const resetPasswordRules = [
  body("token")
    .trim()
    .notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

module.exports = {
  registerRules,
  verifyEmailRules,
  resendOtpRules,
  loginRules,
  refreshTokenRules,
  logoutRules,
  forgotPasswordRules,
  resetPasswordRules,
};

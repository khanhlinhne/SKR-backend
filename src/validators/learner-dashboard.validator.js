const { query } = require("express-validator");

const learnerDashboardQueryRules = [
  query("days")
    .optional()
    .isInt({ min: 7, max: 30 })
    .withMessage("days must be an integer between 7 and 30"),
  query("coursesLimit")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("coursesLimit must be an integer between 1 and 10"),
  query("reviewLimit")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("reviewLimit must be an integer between 1 and 10"),
];

module.exports = { learnerDashboardQueryRules };

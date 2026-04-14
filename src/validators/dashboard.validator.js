const { query } = require("express-validator");

const dashboardQueryRules = [
  query("period")
    .optional()
    .isIn(["week", "month", "year"])
    .withMessage("period must be week, month, or year"),
];

module.exports = { dashboardQueryRules };

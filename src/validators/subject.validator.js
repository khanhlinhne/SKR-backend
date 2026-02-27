const { query, param } = require("express-validator");

const getSubjectsRules = [
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
  query("status")
    .optional()
    .isIn(["draft", "published", "archived"]).withMessage("Status must be draft, published or archived"),
  query("isFree")
    .optional()
    .isIn(["true", "false"]).withMessage("isFree must be true or false"),
  query("isFeatured")
    .optional()
    .isIn(["true", "false"]).withMessage("isFeatured must be true or false"),
  query("creatorId")
    .optional()
    .isUUID().withMessage("creatorId must be a valid UUID"),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "publishedAt", "subjectName", "displayOrder", "priceAmount", "purchaseCount", "ratingAverage"])
    .withMessage("Invalid sortBy field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
];

const getSubjectDetailRules = [
  param("id")
    .isUUID().withMessage("Subject ID must be a valid UUID"),
];

module.exports = {
  getSubjectsRules,
  getSubjectDetailRules,
};

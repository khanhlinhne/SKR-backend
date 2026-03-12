const { query, param, body } = require("express-validator");

const getPackagesRules = [
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
  query("sortBy")
    .optional()
    .isIn(["createdAt", "publishedAt", "packageName", "displayOrder", "priceAmount", "purchaseCount"])
    .withMessage("Invalid sortBy field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
];

const getPackageDetailRules = [
  param("id")
    .isUUID().withMessage("Package ID must be a valid UUID"),
];

const createPackageRules = [
  body("packageCode")
    .trim()
    .notEmpty().withMessage("Package code is required")
    .isLength({ max: 50 }).withMessage("Package code must not exceed 50 characters")
    .matches(/^[A-Z0-9_-]+$/).withMessage("Package code must be uppercase alphanumeric with hyphens/underscores"),
  body("packageName")
    .trim()
    .notEmpty().withMessage("Package name is required")
    .isLength({ max: 255 }).withMessage("Package name must not exceed 255 characters"),
  body("packageDescription")
    .optional({ values: "null" })
    .trim(),
  body("packageIconUrl")
    .optional({ values: "null" })
    .isURL().withMessage("Package icon URL must be a valid URL"),
  body("packageBannerUrl")
    .optional({ values: "null" })
    .isURL().withMessage("Package banner URL must be a valid URL"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
  body("isFree")
    .optional()
    .isBoolean().withMessage("isFree must be a boolean"),
  body("priceAmount")
    .optional()
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Price amount must be a valid decimal"),
  body("originalPrice")
    .optional({ values: "null" })
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Original price must be a valid decimal"),
  body("currencyCode")
    .optional()
    .isLength({ min: 3, max: 3 }).withMessage("Currency code must be exactly 3 characters"),
  body("discountPercent")
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage("Discount percent must be between 0 and 100"),
  body("discountValidUntil")
    .optional({ values: "null" })
    .isISO8601().withMessage("Discount valid until must be a valid date"),
  body("isFeatured")
    .optional()
    .isBoolean().withMessage("isFeatured must be a boolean"),
  body("status")
    .optional()
    .isIn(["draft", "published", "archived"]).withMessage("Status must be draft, published or archived"),
];

const updatePackageRules = [
  param("id")
    .isUUID().withMessage("Package ID must be a valid UUID"),
  body("packageName")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("Package name must not exceed 255 characters"),
  body("packageDescription")
    .optional({ values: "null" })
    .trim(),
  body("packageIconUrl")
    .optional({ values: "null" })
    .isURL().withMessage("Package icon URL must be a valid URL"),
  body("packageBannerUrl")
    .optional({ values: "null" })
    .isURL().withMessage("Package banner URL must be a valid URL"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
  body("isFree")
    .optional()
    .isBoolean().withMessage("isFree must be a boolean"),
  body("priceAmount")
    .optional()
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Price amount must be a valid decimal"),
  body("originalPrice")
    .optional({ values: "null" })
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Original price must be a valid decimal"),
  body("currencyCode")
    .optional()
    .isLength({ min: 3, max: 3 }).withMessage("Currency code must be exactly 3 characters"),
  body("discountPercent")
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage("Discount percent must be between 0 and 100"),
  body("discountValidUntil")
    .optional({ values: "null" })
    .isISO8601().withMessage("Discount valid until must be a valid date"),
  body("isFeatured")
    .optional()
    .isBoolean().withMessage("isFeatured must be a boolean"),
  body("status")
    .optional()
    .isIn(["draft", "published", "archived"]).withMessage("Status must be draft, published or archived"),
];

const deletePackageRules = [
  param("id")
    .isUUID().withMessage("Package ID must be a valid UUID"),
];

const addCourseRules = [
  param("id")
    .isUUID().withMessage("Package ID must be a valid UUID"),
  body("subjectId")
    .notEmpty().withMessage("Subject ID is required")
    .isUUID().withMessage("Subject ID must be a valid UUID"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
];

const removeCourseRules = [
  param("id")
    .isUUID().withMessage("Package ID must be a valid UUID"),
  param("subjectId")
    .isUUID().withMessage("Subject ID must be a valid UUID"),
];

module.exports = {
  getPackagesRules,
  getPackageDetailRules,
  createPackageRules,
  updatePackageRules,
  deletePackageRules,
  addCourseRules,
  removeCourseRules,
};

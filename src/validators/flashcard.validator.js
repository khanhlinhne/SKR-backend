const { body, param, query } = require("express-validator");

const createSetRules = [
  body("setTitle")
    .trim()
    .notEmpty()
    .withMessage("setTitle is required")
    .isLength({ max: 255 })
    .withMessage("setTitle must not exceed 255 characters"),
  body("setDescription").optional().trim().isLength({ max: 2000 }).withMessage("setDescription too long"),
  body("setCoverImageUrl").optional().trim().isURL().withMessage("setCoverImageUrl must be a valid URL"),
  body("lessonId").optional().isUUID().withMessage("lessonId must be a valid UUID"),
  body("subjectId").optional().isUUID().withMessage("subjectId must be a valid UUID"),
  body("visibility")
    .optional()
    .isIn(["public", "private", "premium_only", "unlisted"])
    .withMessage("visibility must be public, private, premium_only or unlisted"),
  body("tags").optional().isArray().withMessage("tags must be an array"),
  body("status")
    .optional()
    .isIn(["draft", "active", "archived"])
    .withMessage("status must be draft, active or archived"),
];

const updateSetRules = [
  param("id").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  body("setTitle")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("setTitle cannot be empty")
    .isLength({ max: 255 })
    .withMessage("setTitle must not exceed 255 characters"),
  body("setDescription").optional().trim().isLength({ max: 2000 }).withMessage("setDescription too long"),
  body("setCoverImageUrl").optional().trim().isURL().withMessage("setCoverImageUrl must be a valid URL"),
  body("lessonId").optional().isUUID().withMessage("lessonId must be a valid UUID"),
  body("subjectId").optional().isUUID().withMessage("subjectId must be a valid UUID"),
  body("visibility")
    .optional()
    .isIn(["public", "private", "premium_only", "unlisted"])
    .withMessage("visibility must be public, private, premium_only or unlisted"),
  body("tags").optional().isArray().withMessage("tags must be an array"),
  body("status")
    .optional()
    .isIn(["draft", "active", "archived"])
    .withMessage("status must be draft, active or archived"),
];

const setIdParamRules = [param("id").isUUID().withMessage("Flashcard set ID must be a valid UUID")];

const getMySetsRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["draft", "active", "archived"])
    .withMessage("status must be draft, active or archived"),
  query("visibility")
    .optional()
    .isIn(["public", "private", "premium_only", "unlisted"])
    .withMessage("visibility must be public, private, premium_only or unlisted"),
];

const getItemsRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
];

const itemIdParamRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  param("itemId").isUUID().withMessage("Flashcard item ID must be a valid UUID"),
];

const createItemRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  body("frontText").trim().notEmpty().withMessage("frontText is required"),
  body("backText").trim().notEmpty().withMessage("backText is required"),
  body("frontImageUrl").optional().trim().isURL().withMessage("frontImageUrl must be a valid URL"),
  body("backImageUrl").optional().trim().isURL().withMessage("backImageUrl must be a valid URL"),
  body("cardOrder").optional().isInt({ min: 0 }).withMessage("cardOrder must be a non-negative integer"),
  body("hintText").optional().trim().isLength({ max: 500 }).withMessage("hintText too long"),
  body("easeFactor").optional().isFloat({ min: 1.3, max: 5 }).withMessage("easeFactor must be between 1.3 and 5"),
  body("intervalDays").optional().isInt({ min: 0 }).withMessage("intervalDays must be non-negative"),
];

const updateItemRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  param("itemId").isUUID().withMessage("Flashcard item ID must be a valid UUID"),
  body("frontText").optional().trim().notEmpty().withMessage("frontText cannot be empty"),
  body("backText").optional().trim().notEmpty().withMessage("backText cannot be empty"),
  body("frontImageUrl").optional().trim().isURL().withMessage("frontImageUrl must be a valid URL"),
  body("backImageUrl").optional().trim().isURL().withMessage("backImageUrl must be a valid URL"),
  body("cardOrder").optional().isInt({ min: 0 }).withMessage("cardOrder must be a non-negative integer"),
  body("hintText").optional().trim().isLength({ max: 500 }).withMessage("hintText too long"),
  body("easeFactor").optional().isFloat({ min: 1.3, max: 5 }).withMessage("easeFactor must be between 1.3 and 5"),
  body("intervalDays").optional().isInt({ min: 0 }).withMessage("intervalDays must be non-negative"),
  body("status").optional().isIn(["active", "inactive"]).withMessage("status must be active or inactive"),
];

module.exports = {
  createSetRules,
  updateSetRules,
  setIdParamRules,
  getMySetsRules,
  getItemsRules,
  itemIdParamRules,
  createItemRules,
  updateItemRules,
};

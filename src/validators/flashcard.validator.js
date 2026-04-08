const { body, param, query } = require("express-validator");

const isValidImageLocation = (value) => {
  if (value == null) return true;
  const input = String(value).trim();
  if (!input) return true;
  if (input.startsWith("/")) return true;
  if (input.startsWith("./") || input.startsWith("../")) return true;
  return /^https?:\/\//i.test(input);
};

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
  body("courseId").optional().isUUID().withMessage("courseId must be a valid UUID"),
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
  body("courseId").optional().isUUID().withMessage("courseId must be a valid UUID"),
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

const getPublicSetsRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("courseId").optional().isUUID().withMessage("courseId must be a valid UUID"),
  query("search").optional().trim().isLength({ max: 255 }).withMessage("search is too long"),
];

const getItemsRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
];

const startStudySessionRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
];

const submitStudyReviewRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  param("sessionId").isUUID().withMessage("Study session ID must be a valid UUID"),
  body("flashcardItemId").isUUID().withMessage("flashcardItemId must be a valid UUID"),
  body("result")
    .isIn(["correct", "incorrect", "skip"])
    .withMessage("result must be correct, incorrect or skip"),
  body("timeToAnswerSeconds")
    .optional()
    .isInt({ min: 0 })
    .withMessage("timeToAnswerSeconds must be a non-negative integer"),
];

const submitStudyReviewBatchRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  param("sessionId").isUUID().withMessage("Study session ID must be a valid UUID"),
  body("reviews")
    .isArray({ min: 1, max: 50 })
    .withMessage("reviews must be an array with 1-50 items"),
  body("reviews.*.flashcardItemId")
    .isUUID()
    .withMessage("Each review flashcardItemId must be a valid UUID"),
  body("reviews.*.result")
    .isIn(["correct", "incorrect", "skip"])
    .withMessage("Each review result must be correct, incorrect or skip"),
];
const completeStudySessionRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  param("sessionId").isUUID().withMessage("Study session ID must be a valid UUID"),
  body("sessionDurationSeconds")
    .optional()
    .isInt({ min: 0 })
    .withMessage("sessionDurationSeconds must be a non-negative integer"),
];

const itemIdParamRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  param("itemId").isUUID().withMessage("Flashcard item ID must be a valid UUID"),
];

const createItemRules = [
  param("setId").isUUID().withMessage("Flashcard set ID must be a valid UUID"),
  body("frontText").trim().notEmpty().withMessage("frontText is required"),
  body("backText").trim().notEmpty().withMessage("backText is required"),
  body("frontImageUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("frontImageUrl must be an absolute URL or a relative path"),
  body("backImageUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("backImageUrl must be an absolute URL or a relative path"),
  body("frontImage")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("frontImage must be an absolute URL or a relative path"),
  body("backImage")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("backImage must be an absolute URL or a relative path"),
  body("frontMediaUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("frontMediaUrl must be an absolute URL or a relative path"),
  body("backMediaUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("backMediaUrl must be an absolute URL or a relative path"),
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
  body("frontImageUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("frontImageUrl must be an absolute URL or a relative path"),
  body("backImageUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("backImageUrl must be an absolute URL or a relative path"),
  body("frontImage")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("frontImage must be an absolute URL or a relative path"),
  body("backImage")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("backImage must be an absolute URL or a relative path"),
  body("frontMediaUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("frontMediaUrl must be an absolute URL or a relative path"),
  body("backMediaUrl")
    .optional({ nullable: true })
    .custom(isValidImageLocation)
    .withMessage("backMediaUrl must be an absolute URL or a relative path"),
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
  getPublicSetsRules,
  getItemsRules,
  startStudySessionRules,
  submitStudyReviewRules,
  submitStudyReviewBatchRules,
  completeStudySessionRules,
  itemIdParamRules,
  createItemRules,
  updateItemRules,
};

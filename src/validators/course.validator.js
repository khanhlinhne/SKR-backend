const { query, param, body } = require("express-validator");
const QUESTION_DIFFICULTY_LEVELS = ["easy", "medium", "hard", "expert"];
const QUESTION_TYPES = ["multiple_choice", "true_false", "essay", "short_answer", "fill_in_blank"];

const getCoursesRules = [
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
    .isIn(["createdAt", "publishedAt", "courseName", "displayOrder", "priceAmount", "purchaseCount", "ratingAverage"])
    .withMessage("Invalid sortBy field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
];

const getCourseDetailRules = [
  param("id")
    .isUUID().withMessage("Course ID must be a valid UUID"),
];

const createCourseRules = [
  body("courseCode")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("courseCode must not exceed 50 characters")
    .matches(/^[A-Za-z0-9_-]+$/).withMessage("courseCode must contain only letters, numbers, hyphens and underscores"),
  body("courseName")
    .trim()
    .notEmpty().withMessage("courseName is required")
    .isLength({ max: 255 }).withMessage("courseName must not exceed 255 characters"),
  body("courseDescription")
    .optional()
    .trim(),
  body("category")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("category must not exceed 100 characters"),
  body("courseIconUrl")
    .optional()
    .trim()
    .isURL().withMessage("courseIconUrl must be a valid URL"),
  body("courseBannerUrl")
    .optional()
    .trim()
    .isURL().withMessage("courseBannerUrl must be a valid URL"),
  body("coursePreviewVideoUrl")
    .optional()
    .trim()
    .isURL().withMessage("coursePreviewVideoUrl must be a valid URL"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("isFree")
    .optional()
    .isBoolean().withMessage("isFree must be a boolean"),
  body("priceAmount")
    .optional()
    .isDecimal().withMessage("priceAmount must be a decimal number"),
  body("originalPrice")
    .optional()
    .isDecimal().withMessage("originalPrice must be a decimal number"),
  body("currencyCode")
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 }).withMessage("currencyCode must be 3 characters"),
  body("discountPercent")
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage("discountPercent must be between 0 and 100"),
  body("discountValidUntil")
    .optional()
    .isISO8601().withMessage("discountValidUntil must be a valid ISO date"),
  body("estimatedDurationHours")
    .optional()
    .isInt({ min: 0 }).withMessage("estimatedDurationHours must be a non-negative integer"),
  body("isFeatured")
    .optional()
    .isBoolean().withMessage("isFeatured must be a boolean"),
  body("status")
    .optional()
    .isIn(["draft", "published", "archived"]).withMessage("status must be draft, published or archived"),
];

const updateCourseRules = [
  param("id")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  body("courseCode")
    .optional()
    .trim()
    .notEmpty().withMessage("courseCode cannot be empty")
    .isLength({ max: 50 }).withMessage("courseCode must not exceed 50 characters")
    .matches(/^[A-Za-z0-9_-]+$/).withMessage("courseCode must contain only letters, numbers, hyphens and underscores"),
  body("courseName")
    .optional()
    .trim()
    .notEmpty().withMessage("courseName cannot be empty")
    .isLength({ max: 255 }).withMessage("courseName must not exceed 255 characters"),
  body("courseDescription")
    .optional()
    .trim(),
  body("category")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("category must not exceed 100 characters"),
  body("courseIconUrl")
    .optional()
    .trim()
    .isURL().withMessage("courseIconUrl must be a valid URL"),
  body("courseBannerUrl")
    .optional()
    .trim()
    .isURL().withMessage("courseBannerUrl must be a valid URL"),
  body("coursePreviewVideoUrl")
    .optional()
    .trim()
    .isURL().withMessage("coursePreviewVideoUrl must be a valid URL"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("isFree")
    .optional()
    .isBoolean().withMessage("isFree must be a boolean"),
  body("priceAmount")
    .optional()
    .isDecimal().withMessage("priceAmount must be a decimal number"),
  body("originalPrice")
    .optional()
    .isDecimal().withMessage("originalPrice must be a decimal number"),
  body("currencyCode")
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 }).withMessage("currencyCode must be 3 characters"),
  body("discountPercent")
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage("discountPercent must be between 0 and 100"),
  body("discountValidUntil")
    .optional()
    .isISO8601().withMessage("discountValidUntil must be a valid ISO date"),
  body("estimatedDurationHours")
    .optional()
    .isInt({ min: 0 }).withMessage("estimatedDurationHours must be a non-negative integer"),
  body("isFeatured")
    .optional()
    .isBoolean().withMessage("isFeatured must be a boolean"),
  body("status")
    .optional()
    .isIn(["draft", "published", "archived"]).withMessage("status must be draft, published or archived"),
];

const deleteCourseRules = [
  param("id")
    .isUUID().withMessage("Course ID must be a valid UUID"),
];

// ──────────────── CHAPTERS ────────────────

const courseIdParamRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
];

const createChapterRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  body("chapterCode")
    .trim()
    .notEmpty().withMessage("chapterCode is required")
    .isLength({ max: 50 }).withMessage("chapterCode must not exceed 50 characters"),
  body("chapterName")
    .trim()
    .notEmpty().withMessage("chapterName is required")
    .isLength({ max: 255 }).withMessage("chapterName must not exceed 255 characters"),
  body("chapterDescription")
    .optional()
    .trim(),
  body("chapterNumber")
    .optional()
    .isInt({ min: 1 }).withMessage("chapterNumber must be a positive integer"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("estimatedDurationMinutes")
    .optional()
    .isInt({ min: 0 }).withMessage("estimatedDurationMinutes must be a non-negative integer"),
];

const updateChapterRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  param("chapterId")
    .isUUID().withMessage("Chapter ID must be a valid UUID"),
  body("chapterCode")
    .optional()
    .trim()
    .notEmpty().withMessage("chapterCode cannot be empty")
    .isLength({ max: 50 }).withMessage("chapterCode must not exceed 50 characters"),
  body("chapterName")
    .optional()
    .trim()
    .notEmpty().withMessage("chapterName cannot be empty")
    .isLength({ max: 255 }).withMessage("chapterName must not exceed 255 characters"),
  body("chapterDescription")
    .optional()
    .trim(),
  body("chapterNumber")
    .optional()
    .isInt({ min: 1 }).withMessage("chapterNumber must be a positive integer"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("estimatedDurationMinutes")
    .optional()
    .isInt({ min: 0 }).withMessage("estimatedDurationMinutes must be a non-negative integer"),
];

const deleteChapterRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  param("chapterId")
    .isUUID().withMessage("Chapter ID must be a valid UUID"),
];

// ──────────────── LESSONS ────────────────

const createLessonRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  param("chapterId")
    .isUUID().withMessage("Chapter ID must be a valid UUID"),
  body("lessonCode")
    .trim()
    .notEmpty().withMessage("lessonCode is required")
    .isLength({ max: 50 }).withMessage("lessonCode must not exceed 50 characters"),
  body("lessonName")
    .trim()
    .notEmpty().withMessage("lessonName is required")
    .isLength({ max: 255 }).withMessage("lessonName must not exceed 255 characters"),
  body("lessonDescription")
    .optional()
    .trim(),
  body("lessonNumber")
    .optional()
    .isInt({ min: 1 }).withMessage("lessonNumber must be a positive integer"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("learningObjectives")
    .optional()
    .trim(),
  body("estimatedDurationMinutes")
    .optional()
    .isInt({ min: 0 }).withMessage("estimatedDurationMinutes must be a non-negative integer"),
];

const updateLessonRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  param("chapterId")
    .isUUID().withMessage("Chapter ID must be a valid UUID"),
  param("lessonId")
    .isUUID().withMessage("Lesson ID must be a valid UUID"),
  body("lessonCode")
    .optional()
    .trim()
    .notEmpty().withMessage("lessonCode cannot be empty")
    .isLength({ max: 50 }).withMessage("lessonCode must not exceed 50 characters"),
  body("lessonName")
    .optional()
    .trim()
    .notEmpty().withMessage("lessonName cannot be empty")
    .isLength({ max: 255 }).withMessage("lessonName must not exceed 255 characters"),
  body("lessonDescription")
    .optional()
    .trim(),
  body("lessonNumber")
    .optional()
    .isInt({ min: 1 }).withMessage("lessonNumber must be a positive integer"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("displayOrder must be a non-negative integer"),
  body("learningObjectives")
    .optional()
    .trim(),
  body("estimatedDurationMinutes")
    .optional()
    .isInt({ min: 0 }).withMessage("estimatedDurationMinutes must be a non-negative integer"),
];

const deleteLessonRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  param("chapterId")
    .isUUID().withMessage("Chapter ID must be a valid UUID"),
  param("lessonId")
    .isUUID().withMessage("Lesson ID must be a valid UUID"),
];

const updateQuestionRules = [
  param("courseId")
    .isUUID().withMessage("Course ID must be a valid UUID"),
  param("chapterId")
    .isUUID().withMessage("Chapter ID must be a valid UUID"),
  param("lessonId")
    .isUUID().withMessage("Lesson ID must be a valid UUID"),
  param("questionId")
    .isUUID().withMessage("Question ID must be a valid UUID"),
  body("questionText")
    .optional()
    .isString().withMessage("questionText must be a string")
    .trim()
    .notEmpty().withMessage("questionText cannot be empty"),
  body("questionType")
    .optional()
    .isIn(QUESTION_TYPES)
    .withMessage(`questionType must be one of: ${QUESTION_TYPES.join(", ")}`),
  body("type")
    .optional()
    .isIn(QUESTION_TYPES)
    .withMessage(`type must be one of: ${QUESTION_TYPES.join(", ")}`),
  body("difficultyLevel")
    .optional()
    .isIn(QUESTION_DIFFICULTY_LEVELS)
    .withMessage(`difficultyLevel must be one of: ${QUESTION_DIFFICULTY_LEVELS.join(", ")}`),
  body("difficulty")
    .optional()
    .isIn(QUESTION_DIFFICULTY_LEVELS)
    .withMessage(`difficulty must be one of: ${QUESTION_DIFFICULTY_LEVELS.join(", ")}`),
  body("questionExplanation")
    .optional()
    .isString().withMessage("questionExplanation must be a string")
    .trim(),
  body("explanation")
    .optional()
    .isString().withMessage("explanation must be a string")
    .trim(),
  body("options")
    .optional()
    .isArray({ min: 1 }).withMessage("options must be a non-empty array"),
  body("options.*.optionText")
    .if(body("options").exists())
    .isString().withMessage("options.optionText must be a string")
    .trim()
    .notEmpty().withMessage("options.optionText cannot be empty"),
  body("options.*.optionOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("options.optionOrder must be a non-negative integer"),
  body("options.*.isCorrect")
    .optional()
    .isBoolean().withMessage("options.isCorrect must be a boolean"),
  body("options.*.optionExplanation")
    .optional()
    .isString().withMessage("options.optionExplanation must be a string")
    .trim(),
];

module.exports = {
  getCoursesRules,
  getCourseDetailRules,
  createCourseRules,
  updateCourseRules,
  deleteCourseRules,
  courseIdParamRules,
  createChapterRules,
  updateChapterRules,
  deleteChapterRules,
  createLessonRules,
  updateLessonRules,
  deleteLessonRules,
  updateQuestionRules,
};

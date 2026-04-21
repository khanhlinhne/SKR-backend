const { Router } = require("express");
const courseController = require("../controllers/course.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  uploadDocument,
  handleDocumentMulterError,
} = require("../middlewares/upload.middleware");
const {
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
} = require("../validators/course.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Course
 *     description: Course management
 *   - name: Chapter
 *     description: Chapter management (nested under courses)
 *   - name: Lesson
 *     description: Lesson management (nested under chapters)
 */

// ══════════════════════════════════════════════
//  COURSES
// ══════════════════════════════════════════════

/**
 * @swagger
 * /api/courses:
 *   get:
 *     tags: [Course]
 *     summary: Get courses with pagination
 *     description: Returns a paginated list of courses with optional search, filter and sort.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by course name, code or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by status
 *       - in: query
 *         name: isFree
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by free/paid
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by featured
 *       - in: query
 *         name: creatorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by creator ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, publishedAt, courseName, displayOrder, priceAmount, purchaseCount, ratingAverage]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       400:
 *         description: Validation failed
 */
router.get("/", getCoursesRules, validate, courseController.getCourses);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     tags: [Course]
 *     summary: Create a new course
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseCode, courseName]
 *             properties:
 *               courseCode:
 *                 type: string
 *                 maxLength: 50
 *                 example: MATH-101
 *               courseName:
 *                 type: string
 *                 maxLength: 255
 *                 example: Mathematics 101
 *               courseDescription:
 *                 type: string
 *               courseIconUrl:
 *                 type: string
 *                 format: uri
 *               courseBannerUrl:
 *                 type: string
 *                 format: uri
 *               coursePreviewVideoUrl:
 *                 type: string
 *                 format: uri
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               isFree:
 *                 type: boolean
 *                 default: true
 *               priceAmount:
 *                 type: number
 *               originalPrice:
 *                 type: number
 *               currencyCode:
 *                 type: string
 *                 default: VND
 *               discountPercent:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               discountValidUntil:
 *                 type: string
 *                 format: date-time
 *               estimatedDurationHours:
 *                 type: integer
 *               isFeatured:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Course code already exists
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "creator"),
  createCourseRules,
  validate,
  courseController.createCourse
);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     tags: [Course]
 *     summary: Get course detail
 *     description: Returns full course details including chapters and lessons.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *       400:
 *         description: Invalid course ID format
 *       404:
 *         description: Course not found
 */
router.get("/:id", getCourseDetailRules, validate, courseController.getCourseDetail);
router.get(
  "/:courseId/progress",
  authenticate,
  courseIdParamRules,
  validate,
  courseController.getCourseProgress
);

/**
 * @swagger
 * /api/courses/{id}:
 *   patch:
 *     tags: [Course]
 *     summary: Update a course
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseCode: { type: string, maxLength: 50 }
 *               courseName: { type: string, maxLength: 255 }
 *               courseDescription: { type: string }
 *               courseIconUrl: { type: string, format: uri }
 *               courseBannerUrl: { type: string, format: uri }
 *               coursePreviewVideoUrl: { type: string, format: uri }
 *               displayOrder: { type: integer, minimum: 0 }
 *               isFree: { type: boolean }
 *               priceAmount: { type: number }
 *               originalPrice: { type: number }
 *               currencyCode: { type: string }
 *               discountPercent: { type: integer, minimum: 0, maximum: 100 }
 *               discountValidUntil: { type: string, format: date-time }
 *               estimatedDurationHours: { type: integer }
 *               isFeatured: { type: boolean }
 *               status: { type: string, enum: [draft, published, archived] }
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Course not found
 *       409:
 *         description: Course code already exists
 */
router.patch(
  "/:id",
  authenticate,
  authorize("admin", "creator"),
  updateCourseRules,
  validate,
  courseController.updateCourse
);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     tags: [Course]
 *     summary: Delete a course (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Course not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "creator"),
  deleteCourseRules,
  validate,
  courseController.deleteCourse
);

// ══════════════════════════════════════════════
//  ASSIGN EXPERT
// ══════════════════════════════════════════════

/**
 * @swagger
 * /api/courses/{id}/assign-expert:
 *   patch:
 *     tags: [Course]
 *     summary: Assign an expert to a course (Admin only)
 *     description: Updates the creator/expert responsible for building the course content.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [expertId]
 *             properties:
 *               expertId:
 *                 type: string
 *                 format: uuid
 *                 description: The user ID of the expert to assign
 *     responses:
 *       200:
 *         description: Expert assigned successfully
 *       400:
 *         description: Invalid expert or validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Course or expert not found
 */
router.patch(
  "/:id/assign-expert",
  authenticate,
  authorize("admin"),
  courseController.assignExpert
);

// ══════════════════════════════════════════════
//  CHAPTERS
// ══════════════════════════════════════════════

/**
 * @swagger
 * /api/courses/{courseId}/chapters:
 *   get:
 *     tags: [Chapter]
 *     summary: Get chapters of a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chapters retrieved successfully
 *       404:
 *         description: Course not found
 *   post:
 *     tags: [Chapter]
 *     summary: Create a chapter in a course
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chapterCode, chapterName]
 *             properties:
 *               chapterCode:
 *                 type: string
 *                 maxLength: 50
 *                 example: CH01
 *               chapterName:
 *                 type: string
 *                 maxLength: 255
 *                 example: Introduction
 *               chapterDescription:
 *                 type: string
 *               chapterNumber:
 *                 type: integer
 *                 minimum: 1
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               estimatedDurationMinutes:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Chapter created successfully
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Course not found
 *       409:
 *         description: Chapter code already exists in this course
 */
router.get(
  "/:courseId/chapters",
  courseIdParamRules,
  validate,
  courseController.getChapters
);

router.post(
  "/:courseId/chapters",
  authenticate,
  authorize("admin", "creator"),
  createChapterRules,
  validate,
  courseController.createChapter
);

/**
 * @swagger
 * /api/courses/{courseId}/chapters/{chapterId}:
 *   patch:
 *     tags: [Chapter]
 *     summary: Update a chapter
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chapterCode: { type: string, maxLength: 50 }
 *               chapterName: { type: string, maxLength: 255 }
 *               chapterDescription: { type: string }
 *               chapterNumber: { type: integer, minimum: 1 }
 *               displayOrder: { type: integer, minimum: 0 }
 *               estimatedDurationMinutes: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Chapter updated successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Chapter not found
 *       409:
 *         description: Chapter code already exists
 *   delete:
 *     tags: [Chapter]
 *     summary: Delete a chapter (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chapter deleted successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Chapter not found
 */
router.patch(
  "/:courseId/chapters/:chapterId",
  authenticate,
  authorize("admin", "creator"),
  updateChapterRules,
  validate,
  courseController.updateChapter
);

router.delete(
  "/:courseId/chapters/:chapterId",
  authenticate,
  authorize("admin", "creator"),
  deleteChapterRules,
  validate,
  courseController.deleteChapter
);

// ══════════════════════════════════════════════
//  LESSONS
// ══════════════════════════════════════════════

/**
 * @swagger
 * /api/courses/{courseId}/chapters/{chapterId}/lessons:
 *   get:
 *     tags: [Lesson]
 *     summary: Get lessons of a chapter
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lessons retrieved successfully
 *       404:
 *         description: Course or chapter not found
 *   post:
 *     tags: [Lesson]
 *     summary: Create a lesson in a chapter
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonCode, lessonName]
 *             properties:
 *               lessonCode:
 *                 type: string
 *                 maxLength: 50
 *                 example: LS01
 *               lessonName:
 *                 type: string
 *                 maxLength: 255
 *                 example: Getting Started
 *               lessonDescription:
 *                 type: string
 *               lessonNumber:
 *                 type: integer
 *                 minimum: 1
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               learningObjectives:
 *                 type: string
 *               estimatedDurationMinutes:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Course or chapter not found
 *       409:
 *         description: Lesson code already exists in this chapter
 */
router.get(
  "/:courseId/chapters/:chapterId/lessons",
  deleteChapterRules,
  validate,
  courseController.getLessons
);

router.post(
  "/:courseId/chapters/:chapterId/lessons",
  authenticate,
  authorize("admin", "creator"),
  createLessonRules,
  validate,
  courseController.createLesson
);

/**
 * @swagger
 * /api/courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}:
 *   patch:
 *     tags: [Lesson]
 *     summary: Update a lesson
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lessonCode: { type: string, maxLength: 50 }
 *               lessonName: { type: string, maxLength: 255 }
 *               lessonDescription: { type: string }
 *               lessonNumber: { type: integer, minimum: 1 }
 *               displayOrder: { type: integer, minimum: 0 }
 *               learningObjectives: { type: string }
 *               estimatedDurationMinutes: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Lesson not found
 *       409:
 *         description: Lesson code already exists
 *   delete:
 *     tags: [Lesson]
 *     summary: Delete a lesson (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Lesson not found
 */
router.patch(
  "/:courseId/chapters/:chapterId/lessons/:lessonId",
  authenticate,
  authorize("admin", "creator"),
  updateLessonRules,
  validate,
  courseController.updateLesson
);

router.delete(
  "/:courseId/chapters/:chapterId/lessons/:lessonId",
  authenticate,
  authorize("admin", "creator"),
  deleteLessonRules,
  validate,
  courseController.deleteLesson
);

// ══════════════════════════════════════════════
//  LESSON CONTENT (Videos, Documents, Questions)
// ══════════════════════════════════════════════

// Get lesson content (videos, documents, questions)
router.get(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/content",
  courseController.getLessonContent
);

router.get(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/assignment",
  deleteLessonRules,
  validate,
  courseController.getLessonAssignment
);

router.get(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/assignment/submissions/me",
  authenticate,
  deleteLessonRules,
  validate,
  courseController.getMyLessonAssignmentSubmission
);

// ── Videos ──
router.post(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/videos",
  authenticate,
  authorize("admin", "creator"),
  courseController.addVideo
);

router.delete(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/videos/:videoId",
  authenticate,
  authorize("admin", "creator"),
  courseController.deleteVideo
);

// ── Documents ──
router.post(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/documents",
  authenticate,
  authorize("admin", "creator"),
  uploadDocument.fields([
    { name: "file", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  handleDocumentMulterError,
  courseController.addDocument
);

router.delete(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/documents/:documentId",
  authenticate,
  authorize("admin", "creator"),
  courseController.deleteDocument
);

// ── Questions ──
router.post(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/questions",
  authenticate,
  authorize("admin", "creator"),
  courseController.addQuestion
);

router.delete(
  "/:courseId/chapters/:chapterId/lessons/:lessonId/questions/:questionId",
  authenticate,
  authorize("admin", "creator"),
  courseController.deleteQuestion
);

module.exports = router;

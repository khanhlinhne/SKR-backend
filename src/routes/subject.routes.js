const { Router } = require("express");
const subjectController = require("../controllers/subject.controller");
const { validate } = require("../middlewares/validate.middleware");
const { getSubjectsRules, getSubjectDetailRules } = require("../validators/subject.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Subject
 *     description: Subject management
 */

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     tags: [Subject]
 *     summary: Get subjects with pagination
 *     description: Returns a paginated list of subjects with optional search, filter and sort.
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
 *         description: Search by subject name, code or description
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
 *           enum: [createdAt, publishedAt, subjectName, displayOrder, priceAmount, purchaseCount, ratingAverage]
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
 *         description: Subjects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SubjectListItem'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation failed
 */
router.get("/", getSubjectsRules, validate, subjectController.getSubjects);

/**
 * @swagger
 * /api/subjects/{id}:
 *   get:
 *     tags: [Subject]
 *     summary: Get subject detail
 *     description: Returns full subject details including chapters and lessons.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subject ID
 *     responses:
 *       200:
 *         description: Subject retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/SubjectDetail'
 *       400:
 *         description: Invalid subject ID format
 *       404:
 *         description: Subject not found
 */
router.get("/:id", getSubjectDetailRules, validate, subjectController.getSubjectDetail);

module.exports = router;

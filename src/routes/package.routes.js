const { Router } = require("express");
const packageController = require("../controllers/package.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  getPackagesRules,
  getPackageDetailRules,
  createPackageRules,
  updatePackageRules,
  deletePackageRules,
  addCourseRules,
  removeCourseRules,
} = require("../validators/package.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Package
 *     description: Course package management
 */

/**
 * @swagger
 * /api/packages:
 *   get:
 *     tags: [Package]
 *     summary: Get packages with pagination
 *     description: Returns a paginated list of course packages with optional search, filter and sort.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by package name, code or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *       - in: query
 *         name: isFree
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, publishedAt, packageName, displayOrder, priceAmount, purchaseCount]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
 */
router.get("/", getPackagesRules, validate, packageController.getPackages);

/**
 * @swagger
 * /api/packages/{id}:
 *   get:
 *     tags: [Package]
 *     summary: Get package detail
 *     description: Returns full package details including courses in the package.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Package retrieved successfully
 *       404:
 *         description: Package not found
 */
router.get("/:id", getPackageDetailRules, validate, packageController.getPackageDetail);

/**
 * @swagger
 * /api/packages:
 *   post:
 *     tags: [Package]
 *     summary: Create a new package
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageCode
 *               - packageName
 *             properties:
 *               packageCode:
 *                 type: string
 *                 example: PKG-MATH-2024
 *               packageName:
 *                 type: string
 *               packageDescription:
 *                 type: string
 *               packageIconUrl:
 *                 type: string
 *               packageBannerUrl:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isFree:
 *                 type: boolean
 *               priceAmount:
 *                 type: number
 *               originalPrice:
 *                 type: number
 *               currencyCode:
 *                 type: string
 *               discountPercent:
 *                 type: integer
 *               discountValidUntil:
 *                 type: string
 *                 format: date-time
 *               isFeatured:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       201:
 *         description: Package created successfully
 *       409:
 *         description: Package code already exists
 */
router.post("/", authenticate, authorize("admin"), createPackageRules, validate, packageController.createPackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   patch:
 *     tags: [Package]
 *     summary: Update a package
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageName:
 *                 type: string
 *               packageDescription:
 *                 type: string
 *               packageIconUrl:
 *                 type: string
 *               packageBannerUrl:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isFree:
 *                 type: boolean
 *               priceAmount:
 *                 type: number
 *               originalPrice:
 *                 type: number
 *               currencyCode:
 *                 type: string
 *               discountPercent:
 *                 type: integer
 *               discountValidUntil:
 *                 type: string
 *                 format: date-time
 *               isFeatured:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       200:
 *         description: Package updated successfully
 *       404:
 *         description: Package not found
 */
router.patch("/:id", authenticate, authorize("admin"), updatePackageRules, validate, packageController.updatePackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   delete:
 *     tags: [Package]
 *     summary: Delete a package (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *       404:
 *         description: Package not found
 */
router.delete("/:id", authenticate, authorize("admin"), deletePackageRules, validate, packageController.deletePackage);

/**
 * @swagger
 * /api/packages/{id}/courses:
 *   post:
 *     tags: [Package]
 *     summary: Add a course (subject) to a package
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectId
 *             properties:
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Course added to package successfully
 *       404:
 *         description: Package or subject not found
 *       409:
 *         description: Subject already in package
 */
router.post("/:id/courses", authenticate, authorize("admin"), addCourseRules, validate, packageController.addCourse);

/**
 * @swagger
 * /api/packages/{id}/courses/{subjectId}:
 *   delete:
 *     tags: [Package]
 *     summary: Remove a course (subject) from a package
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Course removed from package successfully
 *       404:
 *         description: Package or subject not found in package
 */
router.delete("/:id/courses/:subjectId", authenticate, authorize("admin"), removeCourseRules, validate, packageController.removeCourse);

module.exports = router;

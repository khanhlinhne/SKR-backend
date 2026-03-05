const { Router } = require("express");
const documentController = require("../controllers/document.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  uploadDocument,
  handleDocumentMulterError,
} = require("../middlewares/upload.middleware");
const { param, query } = require("express-validator");
const { validate } = require("../middlewares/validate.middleware");

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Documents
 *     description: Learning document upload and management
 */

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a learning document (PDF, DOCX, etc.)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [document]
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: PDF, DOC, DOCX, ODT or TXT — max 20MB
 *               documentTitle:
 *                 type: string
 *                 description: Optional title (defaults to filename)
 *               documentDescription:
 *                 type: string
 *               lessonId:
 *                 type: string
 *                 format: uuid
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *               visibility:
 *                 type: string
 *                 enum: [public, private, premium_only, unlisted]
 *               tags:
 *                 type: string
 *                 description: JSON array of tag strings
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: No file, invalid type or size
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/upload",
  uploadDocument.single("document"),
  handleDocumentMulterError,
  documentController.uploadDocument
);

/**
 * @swagger
 * /api/documents:
 *   get:
 *     tags: [Documents]
 *     summary: Get my uploaded documents
 *     security:
 *       - BearerAuth: []
 */
router.get("/", documentController.getMyDocuments);

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get document by ID
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Document ID must be a valid UUID")],
  validate,
  documentController.getDocumentById
);

module.exports = router;

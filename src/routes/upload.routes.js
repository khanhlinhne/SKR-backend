const { Router } = require("express");
const uploadController = require("../controllers/upload.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { upload, handleMulterError } = require("../middlewares/upload.middleware");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Upload
 *     description: File upload
 */

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     tags: [Upload]
 *     summary: Upload an image to ImgBB
 *     description: Uploads an image file (jpg, png, webp, gif) to ImgBB and returns the hosted URL. Requires authentication. Max file size is 5MB.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpg, png, webp, gif) — max 5MB
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         imageId:
 *                           type: string
 *                           example: abc123
 *                         url:
 *                           type: string
 *                           format: uri
 *                           example: https://i.ibb.co/abc123/photo.jpg
 *                         displayUrl:
 *                           type: string
 *                           format: uri
 *                           example: https://i.ibb.co/abc123/photo.jpg
 *                         thumbUrl:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           example: https://i.ibb.co/abc123/photo.jpg
 *                         deleteUrl:
 *                           type: string
 *                           format: uri
 *                           example: https://ibb.co/abc123
 *                         width:
 *                           type: integer
 *                           example: 800
 *                         height:
 *                           type: integer
 *                           example: 600
 *                         size:
 *                           type: integer
 *                           description: File size in bytes
 *                           example: 204800
 *       400:
 *         description: No file provided, invalid file type, or file too large
 *       401:
 *         description: Access token missing or invalid
 *       500:
 *         description: ImgBB upload failed
 */
router.post(
  "/image",
  authenticate,
  upload.single("image"),
  handleMulterError,
  uploadController.uploadImage,
);

module.exports = router;

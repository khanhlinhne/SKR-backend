const { Router } = require("express");
const userController = require("../controllers/user.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");
const { updateProfileRules, changePasswordRules } = require("../validators/user.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: User
 *     description: User profile management
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     tags: [User]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's full profile including roles.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProfileResponse'
 *       401:
 *         description: Access token missing or invalid
 */
router.get("/profile", authenticate, userController.getProfile);

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     tags: [User]
 *     summary: Update current user profile
 *     description: Updates editable profile fields. All fields are optional; only provided fields are updated.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
  *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: new_username
 *               fullName:
 *                 type: string
 *                 description: Display name will be automatically set to the last word of full name
 *                 example: Nguyen Van A
 *               phoneNumber:
 *                 type: string
 *                 example: "+84901234567"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "2000-01-15"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: Software developer & lifelong learner
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.jpg
 *               timezoneOffset:
 *                 type: integer
 *                 minimum: -12
 *                 maximum: 14
 *                 example: 7
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProfileResponse'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Access token missing or invalid
 *       409:
 *         description: Username already taken
 */
router.put("/profile", authenticate, updateProfileRules, validate, userController.updateProfile);

/**
 * @swagger
 * /api/user/change-password:
 *   post:
 *     tags: [User]
 *     summary: Change password
 *     description: Changes the authenticated user's password. Requires the current password for verification. Not available for social login accounts.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldSecret123
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newSecret456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation failed, current password incorrect, or social login account
 *       401:
 *         description: Access token missing or invalid
 */
router.post("/change-password", authenticate, changePasswordRules, validate, userController.changePassword);

module.exports = router;

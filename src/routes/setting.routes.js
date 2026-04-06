const { Router } = require("express");
const settingController = require("../controllers/setting.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  getSettingsRules,
  getSettingDetailRules,
  createSettingRules,
  updateSettingRules,
  deleteSettingRules,
} = require("../validators/setting.validator");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Setting
 *     description: System configuration management (admin only)
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     tags: [Setting]
 *     summary: Get settings with pagination
 *     description: Returns a paginated list of system settings. Admin only.
 *     security:
 *       - bearerAuth: []
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
 *         description: Search by key, label or description
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *         description: Filter by setting group
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", authenticate, authorize("admin"), getSettingsRules, validate, settingController.getSettings);

/**
 * @swagger
 * /api/settings/{id}:
 *   get:
 *     tags: [Setting]
 *     summary: Get setting detail
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
 *         description: Setting retrieved successfully
 *       404:
 *         description: Setting not found
 */
router.get("/:id", authenticate, authorize("admin"), getSettingDetailRules, validate, settingController.getSettingDetail);

/**
 * @swagger
 * /api/settings:
 *   post:
 *     tags: [Setting]
 *     summary: Create a new setting
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settingKey
 *               - settingLabel
 *             properties:
 *               settingKey:
 *                 type: string
 *                 example: site.name
 *               settingValue:
 *                 type: string
 *               settingType:
 *                 type: string
 *                 enum: [string, number, boolean, json]
 *                 default: string
 *               settingGroup:
 *                 type: string
 *                 default: general
 *               settingLabel:
 *                 type: string
 *               settingDescription:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *               displayOrder:
 *                 type: integer
 *                 default: 0
 *     responses:
 *       201:
 *         description: Setting created successfully
 *       409:
 *         description: Setting key already exists
 */
router.post("/", authenticate, authorize("admin"), createSettingRules, validate, settingController.createSetting);

/**
 * @swagger
 * /api/settings/{id}:
 *   patch:
 *     tags: [Setting]
 *     summary: Update a setting
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
 *               settingValue:
 *                 type: string
 *               settingType:
 *                 type: string
 *                 enum: [string, number, boolean, json]
 *               settingGroup:
 *                 type: string
 *               settingLabel:
 *                 type: string
 *               settingDescription:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Setting updated successfully
 *       404:
 *         description: Setting not found
 */
router.patch("/:id", authenticate, authorize("admin"), updateSettingRules, validate, settingController.updateSetting);

/**
 * @swagger
 * /api/settings/{id}:
 *   delete:
 *     tags: [Setting]
 *     summary: Delete a setting (soft delete)
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
 *         description: Setting deleted successfully
 *       404:
 *         description: Setting not found
 */
router.delete("/:id", authenticate, authorize("admin"), deleteSettingRules, validate, settingController.deleteSetting);

module.exports = router;

const { Router } = require("express");
const migrationController = require("../controllers/migration.controller");

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Migration
 *     description: Data migration / seeding (no authentication required)
 */

/**
 * @swagger
 * /api/migration/seed-courses:
 *   get:
 *     tags: [Migration]
 *     summary: Seed 10 courses with chapters and lessons
 *     description: Creates 10 sample courses. Skips if course_code already exists.
 *     responses:
 *       200:
 *         description: Migration completed successfully
 */
router.get("/seed-courses", migrationController.seedCourses);

/**
 * @swagger
 * /api/migration/seed-flashcards:
 *   get:
 *     tags: [Migration]
 *     summary: Seed flashcard sets with items
 *     description: Creates 6 flashcard sets (8-10 cards each) linked to existing courses. Skips if already exists.
 *     responses:
 *       200:
 *         description: Migration completed successfully
 */
router.get("/seed-flashcards", migrationController.seedFlashcards);

/**
 * @swagger
 * /api/migration/seed-packages:
 *   get:
 *     tags: [Migration]
 *     summary: Seed course packages
 *     description: Creates 5 course packages bundling existing courses. Skips if package_code already exists.
 *     responses:
 *       200:
 *         description: Migration completed successfully
 */
router.get("/seed-packages", migrationController.seedPackages);

/**
 * @swagger
 * /api/migration/seed-settings:
 *   get:
 *     tags: [Migration]
 *     summary: Seed system settings
 *     description: Creates 21 system settings across groups (general, contact, upload, payment, ai). Skips if setting_key already exists.
 *     responses:
 *       200:
 *         description: Migration completed successfully
 */
router.get("/seed-settings", migrationController.seedSettings);

module.exports = router;

const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const uploadRoutes = require("./upload.routes");
const courseRoutes = require("./course.routes");
const flashcardRoutes = require("./flashcard.routes");
const documentRoutes = require("./document.routes");
const settingRoutes = require("./setting.routes");
const packageRoutes = require("./package.routes");
const migrationRoutes = require("./migration.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/courses", courseRoutes);
router.use("/flashcard-sets", flashcardRoutes);
router.use("/documents", documentRoutes);
router.use("/settings", settingRoutes);
router.use("/packages", packageRoutes);
router.use("/migration", migrationRoutes);

module.exports = router;

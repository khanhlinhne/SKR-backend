const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const uploadRoutes = require("./upload.routes");
const courseRoutes = require("./course.routes");
const flashcardRoutes = require("./flashcard.routes");
const documentRoutes = require("./document.routes");
const settingRoutes = require("./setting.routes");
const packageRoutes = require("./package.routes");
const aiGeminiRoutes = require("./ai-gemini.routes");
const registrationAdminRoutes = require("./registration-admin.routes");
const dashboardAdminRoutes = require("./dashboard-admin.routes");
const enrollmentRoutes = require("./enrollment.routes");
const quizRoutes = require("./quiz.routes");
const quizAttemptRoutes = require("./quiz-attempts.routes");
const orderRoutes = require("./order.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/courses", courseRoutes);
router.use("/flashcard-sets", flashcardRoutes);
router.use("/documents", documentRoutes);
router.use("/settings", settingRoutes);
router.use("/packages", packageRoutes);
router.use("/ai-gemini", aiGeminiRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/quiz-practices", quizRoutes);
router.use("/quiz-attempts", quizAttemptRoutes);
router.use("/orders", orderRoutes);
router.use("/admin/registrations", registrationAdminRoutes);
router.use("/admin/dashboard", dashboardAdminRoutes);

module.exports = router;

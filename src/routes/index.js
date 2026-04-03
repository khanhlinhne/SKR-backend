const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const uploadRoutes = require("./upload.routes");
const courseRoutes = require("./course.routes");
const quizPracticesRoutes = require("./quiz.routes");
const quizAttemptsRoutes = require("./quiz-attempts.routes");
const flashcardRoutes = require("./flashcard.routes");
const flashcardPublicRoutes = require("./flashcard-public.routes");
const documentRoutes = require("./document.routes");
const enrollmentRoutes = require("./enrollment.routes");
const expertRoutes = require("./expert.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/courses", courseRoutes);
router.use("/quiz-practices", quizPracticesRoutes);
router.use("/quiz-attempts", quizAttemptsRoutes);
router.use("/public/flashcard-sets", flashcardPublicRoutes);
router.use("/flashcard-sets", flashcardRoutes);
router.use("/documents", documentRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/experts", expertRoutes);

module.exports = router;

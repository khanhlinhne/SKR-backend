const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const uploadRoutes = require("./upload.routes");
const courseRoutes = require("./course.routes");
const flashcardRoutes = require("./flashcard.routes");
const flashcardPublicRoutes = require("./flashcard-public.routes");
const documentRoutes = require("./document.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/courses", courseRoutes);
router.use("/public/flashcard-sets", flashcardPublicRoutes);
router.use("/flashcard-sets", flashcardRoutes);
router.use("/documents", documentRoutes);

module.exports = router;

const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const uploadRoutes = require("./upload.routes");
const subjectRoutes = require("./subject.routes");
const flashcardRoutes = require("./flashcard.routes");
const documentRoutes = require("./document.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/subjects", subjectRoutes);
router.use("/flashcard-sets", flashcardRoutes);
router.use("/documents", documentRoutes);

module.exports = router;

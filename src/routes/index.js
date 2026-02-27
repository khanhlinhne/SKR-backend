const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const uploadRoutes = require("./upload.routes");
const subjectRoutes = require("./subject.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/subjects", subjectRoutes);

module.exports = router;

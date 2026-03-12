const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const uploadRoutes = require("./upload.routes");
const subjectRoutes = require("./subject.routes");
const settingRoutes = require("./setting.routes");
const packageRoutes = require("./package.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/subjects", subjectRoutes);
router.use("/settings", settingRoutes);
router.use("/packages", packageRoutes);

module.exports = router;

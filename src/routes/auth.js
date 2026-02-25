const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const pool = require("../db/connect");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, phone, fullName } = req.body;

    if ((!username && !email) || !password) {
      return res
        .status(400)
        .json({ message: "Thiếu username/email hoặc password" });
    }

    const existing = await pool.query(
      "SELECT * FROM users WHERE username=$1 OR email=$2",
      [username || null, email || null]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "User đã tồn tại" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const role = "user"; // luôn đăng ký là user thường

    const newUser = await pool.query(
      `INSERT INTO users(username,email,phone,full_name,password,auth_provider,role)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, username, email, phone, full_name, role`,
      [username || null, email || null, phone || null, fullName || null, hashed, "local", role]
    );

    res.status(201).json({
      message: "Đăng ký thành công",
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Có lỗi xảy ra khi đăng ký", error: err.message });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!password || (!username && !email)) {
      return res
        .status(400)
        .json({ message: "Thiếu username/email hoặc password" });
    }

    const result = await pool.query(
      `SELECT id, username, email, phone, full_name, role, password
       FROM users
       WHERE username=$1 OR email=$2`,
      [username || null, email || null]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User không tồn tại" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Sai password" });
    }

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || "user",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        fullName: user.full_name,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Có lỗi xảy ra khi đăng nhập", error: err.message });
  }
});

// ================= GOOGLE LOGIN =================
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const payload = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role || "user",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/dashboard?token=${token}`);
  }
);

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email && !username) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập email hoặc username" });
    }

    let userResult;

    if (email) {
      userResult = await pool.query(
        "SELECT id, email FROM users WHERE email=$1",
        [email]
      );
    } else {
      userResult = await pool.query(
        "SELECT id, username, email FROM users WHERE username=$1",
        [username]
      );
    }

    if (userResult.rows.length === 0) {
      // trả về message chung để tránh lộ thông tin user tồn tại hay không
      return res.json({
        message:
          "Nếu tài khoản tồn tại, link đặt lại mật khẩu đã được gửi qua email",
      });
    }

    const user = userResult.rows[0];

    const resetToken = jwt.sign(
      { id: user.id },
      process.env.RESET_PASSWORD_SECRET ||
        (process.env.JWT_SECRET && process.env.JWT_SECRET + "_reset"),
      { expiresIn: "15m" }
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // TODO: tích hợp gửi email (nodemailer, dịch vụ mail, ...)
    // Hiện tại trả luôn link về cho FE để hiển thị hoặc dùng để debug

    res.json({
      message:
        "Nếu tài khoản tồn tại, link đặt lại mật khẩu đã được tạo thành công",
      resetLink,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Có lỗi xảy ra khi xử lý quên mật khẩu",
      error: err.message,
    });
  }
});

// ================= RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Thiếu token hoặc mật khẩu mới" });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.RESET_PASSWORD_SECRET ||
          (process.env.JWT_SECRET && process.env.JWT_SECRET + "_reset")
      );
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [
      hashed,
      decoded.id,
    ]);

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Có lỗi xảy ra khi đổi mật khẩu",
      error: err.message,
    });
  }
});

// ================= LOGOUT (JWT) =================
router.post("/logout", authMiddleware, (req, res) => {
  // Với JWT lưu phía client, logout chủ yếu là xoá token phía FE.
  // Endpoint này để FE gọi cho đủ flow, có thể log history nếu cần.
  res.json({ message: "Đăng xuất thành công" });
});

// ================= PROTECTED ROUTES & ROLES =================
// Lấy thông tin user đang đăng nhập
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, phone, full_name, role
       FROM users
       WHERE id=$1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Có lỗi xảy ra khi lấy thông tin user" });
  }
});

// Chỉ admin mới vào được
router.get(
  "/admin-only",
  authMiddleware,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({ message: "Chào Admin, bạn có toàn quyền hệ thống" });
  }
);

// Manager và Admin đều dùng được
router.get(
  "/manager-or-admin",
  authMiddleware,
  authorizeRoles("manager", "admin"),
  (req, res) => {
    res.json({
      message: "Chào Manager/Admin, bạn có quyền quản lý tài nguyên",
    });
  }
);

module.exports = router;
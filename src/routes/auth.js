const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const pool = require("../db/connect");
const UserModel = require("../models/user.model");

/*
=========================================
REGISTER
=========================================
*/
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }

    // Kiểm tra tồn tại
    const existing = await pool.query(
      "SELECT user_id FROM mst_users WHERE username=$1 OR email=$2",
      [username, email],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "User đã tồn tại" });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.createUser({ userId, username, email, hashedPassword });

    res.status(201).json({
      message: "Đăng ký thành công",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

/*
=========================================
LOGIN
=========================================
*/
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }

    const result = await pool.query(
      "SELECT * FROM mst_users WHERE username=$1 OR email=$2",
      [username, email],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User không tồn tại" });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    // Nếu user chỉ đăng ký bằng Google (không có password)
    if (!user.password_hash) {
      return res.status(400).json({
        message:
          "Tài khoản này đăng ký bằng Google. Vui lòng đăng nhập bằng Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    // Cập nhật last_login_at_utc
    await pool.query(
      "UPDATE mst_users SET last_login_at_utc = NOW(), updated_at_utc = NOW(), updated_by=$1 WHERE user_id=$1",
      [user.user_id],
    );

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Đăng nhập thành công",
      token,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

/*
=========================================
GOOGLE OAUTH — Bước 1: Redirect tới Google
=========================================
*/
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

/*
=========================================
GOOGLE OAUTH — Bước 2: Google callback
=========================================
*/
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // Cập nhật last login
      await UserModel.updateLastLogin(user.user_id);

      // Tạo JWT token giống login thường
      const token = jwt.sign(
        {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
      );

      // Redirect về frontend kèm token trong query string
      // Frontend sẽ lấy token từ URL và lưu vào localStorage
      res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${token}`);
    } catch (error) {
      console.error("GOOGLE CALLBACK ERROR:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  },
);

module.exports = router;

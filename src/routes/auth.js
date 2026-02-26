const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db/connect");

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

    await pool.query(
      `INSERT INTO mst_users (
        user_id,
        username,
        email,
        password_hash,
        timezone_offset,
        is_active,
        email_verified,
        created_by,
        created_at_utc,
        updated_by,
        updated_at_utc
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,NOW())`,
      [
        userId,
        username,
        email,
        hashedPassword,
        0, // timezone_offset
        true, // is_active
        false, // email_verified
        userId, // created_by (self)
        userId, // updated_by
      ],
    );

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

module.exports = router;

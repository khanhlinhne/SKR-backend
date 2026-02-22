const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const pool = require("../db/connect");

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if ((!username && !email) || !password)
    return res.status(400).json({ message: "Thiếu thông tin" });

  const existing = await pool.query(
    "SELECT * FROM users WHERE username=$1 OR email=$2",
    [username, email]
  );

  if (existing.rows.length > 0)
    return res.status(400).json({ message: "User đã tồn tại" });

  const hashed = await bcrypt.hash(password, 10);

  const newUser = await pool.query(
    "INSERT INTO users(username,email,password,auth_provider) VALUES($1,$2,$3,$4) RETURNING *",
    [username, email, hashed, "local"]
  );

  res.json({ message: "Đăng ký thành công" });
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { username, email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1 OR email=$2",
    [username, email]
  );

  if (result.rows.length === 0)
    return res.status(400).json({ message: "User không tồn tại" });

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch)
    return res.status(400).json({ message: "Sai password" });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
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
    const token = jwt.sign(
      { id: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.redirect(`http://localhost:5173/dashboard?token=${token}`);
  }
);

module.exports = router;
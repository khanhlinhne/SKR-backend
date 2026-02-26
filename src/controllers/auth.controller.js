const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }

    const existing = await UserModel.findByEmailOrUsername(username, email);
    if (existing) {
      return res.status(400).json({ message: "User đã tồn tại" });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.createUser({ userId, username, email, hashedPassword });

    return res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }

    const user = await UserModel.findByEmailOrUsername(username, email);

    if (!user) {
      return res.status(400).json({ message: "User không tồn tại" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    await UserModel.updateLastLogin(user.user_id);

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({ message: "Đăng nhập thành công", token });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

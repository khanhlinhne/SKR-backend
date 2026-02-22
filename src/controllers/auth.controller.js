const pool = require("../db/connect");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER LOCAL
exports.register = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // check trùng email
    if (email) {
      const check = await pool.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
      );
      if (check.rows.length)
        return res.status(400).json({ msg: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `INSERT INTO users(username,email,phone,password,auth_provider)
       VALUES($1,$2,$3,$4,'local') RETURNING *`,
      [username, email, phone, hash]
    );

    res.json(user.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

// LOGIN LOCAL
console.log(req.body);
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return res
        .status(400)
        .json({ message: "Thiếu username/email hoặc password" });
    }

    let user;

    if (email) {
      user = await pool.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
      );
    } else {
      user = await pool.query(
        "SELECT * FROM users WHERE username=$1",
        [username]
      );
    }

    if (!user.rows.length)
      return res.status(400).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.rows[0].password);
    if (!valid)
      return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user: user.rows[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
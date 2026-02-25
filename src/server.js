const express = require("express");
const cors = require("cors");
require("dotenv").config();
const passport = require("passport");
require("./config/passport");

// tạo app trước
const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Backend OK");
});

// chạy server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server chạy tại port ${PORT}`);
});

//hung
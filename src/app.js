const express = require("express");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();

// Load Passport Google Strategy
require("./config/passport");

// tạo app
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

module.exports = app;

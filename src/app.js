const express = require("express");
const cors = require("cors");
require("dotenv").config();

// tạo app
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Backend OK");
});

module.exports = app;

const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");

function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

function generateRefreshToken() {
  return uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "");
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function getRefreshTokenExpiresAt() {
  const match = config.jwt.refreshExpiresIn.match(/^(\d+)([dhms])$/);
  if (!match) throw new Error("Invalid JWT_REFRESH_EXPIRES_IN format");

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const ms = { d: 86400000, h: 3600000, m: 60000, s: 1000 };

  return new Date(Date.now() + value * ms[unit]);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  getRefreshTokenExpiresAt,
};

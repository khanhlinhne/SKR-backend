const { verifyAccessToken } = require("../utils/jwt.util");
const AppError = require("../utils/AppError");

function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Access token is required"));
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(AppError.unauthorized("Access token has expired"));
    }
    return next(AppError.unauthorized("Invalid access token"));
  }
}

module.exports = { authenticate };

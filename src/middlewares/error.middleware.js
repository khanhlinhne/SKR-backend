const AppError = require("../utils/AppError");
const { error } = require("../utils/response.util");

function errorHandler(err, _req, res, _next) {
  if (process.env.NODE_ENV === "development") {
    console.error("[ERROR]", err);
  }

  if (err instanceof AppError) {
    return error(res, {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  return error(res, {
    statusCode: 500,
    message: "Internal server error",
  });
}

function notFoundHandler(_req, _res, next) {
  next(AppError.notFound("Route not found"));
}

module.exports = { errorHandler, notFoundHandler };

const fs = require("fs");
const os = require("os");
const path = require("path");
const AppError = require("../utils/AppError");
const { error } = require("../utils/response.util");

function writeDebugErrorLog(err, req) {
  if (process.env.NODE_ENV === "production") return;

  try {
    const target = path.join(os.tmpdir(), "skr-backend-errors.log");
    const entry = [
      `time=${new Date().toISOString()}`,
      `method=${req.method}`,
      `url=${req.originalUrl || req.url}`,
      `userId=${req.user?.userId || "anonymous"}`,
      `status=${err?.statusCode || 500}`,
      `message=${err?.message || "unknown error"}`,
      `body=${JSON.stringify(req.body || {})}`,
      `params=${JSON.stringify(req.params || {})}`,
      `query=${JSON.stringify(req.query || {})}`,
      err?.stack || String(err),
      "",
    ].join("\n");

    fs.appendFileSync(target, `${entry}\n`, "utf8");
  } catch (_logError) {
    // Avoid masking the original request error.
  }
}

function errorHandler(err, req, res, _next) {
  if (process.env.NODE_ENV === "development") {
    console.error("[ERROR]", err);
  }

  const requestPath = req.originalUrl || req.url || "";
  if (!(err instanceof AppError) || requestPath.includes("/assignment")) {
    writeDebugErrorLog(err, req);
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

const multer = require("multer");
const AppError = require("../utils/AppError");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(AppError.badRequest("Only image files are allowed (jpg, png, webp, gif)"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

function handleMulterError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(AppError.badRequest("File size must not exceed 5MB"));
    }
    return next(AppError.badRequest(err.message));
  }
  next(err);
}

module.exports = { upload, handleMulterError };

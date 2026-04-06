const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const AppError = require("../utils/AppError");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.oasis.opendocument.text", // .odt
  "text/plain",
];
const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

/** Writable on Vercel serverless; local dev uses project ./uploads/documents */
function resolveUploadDocumentsDir() {
  if (process.env.UPLOAD_DOCUMENTS_DIR) {
    return path.resolve(process.env.UPLOAD_DOCUMENTS_DIR);
  }
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "skr-backend", "uploads", "documents");
  }
  return path.join(process.cwd(), "uploads", "documents");
}

const UPLOAD_DOCUMENTS_DIR = resolveUploadDocumentsDir();
/** Parent of `documents` — use for `express.static("/uploads", ...)` so URLs match */
const UPLOADS_BASE_DIR = path.dirname(UPLOAD_DOCUMENTS_DIR);

try {
  if (!fs.existsSync(UPLOAD_DOCUMENTS_DIR)) {
    fs.mkdirSync(UPLOAD_DOCUMENTS_DIR, { recursive: true });
  }
} catch (err) {
  console.error("[upload.middleware] Failed to create UPLOAD_DOCUMENTS_DIR:", UPLOAD_DOCUMENTS_DIR, err);
  throw err;
}

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
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
});

function documentFileFilter(_req, file, cb) {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      AppError.badRequest(
        "Only document files are allowed (PDF, DOC, DOCX, PPT, PPTX, ODT, TXT)"
      )
    );
  }
  cb(null, true);
}

const documentStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DOCUMENTS_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || getExtensionByMime(file.mimetype);
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/\s+/g, "-")
      .slice(0, 100);
    const unique = `${Date.now()}-${base}${ext}`;
    cb(null, unique);
  },
});

function getExtensionByMime(mimetype) {
  const map = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.oasis.opendocument.text": ".odt",
    "text/plain": ".txt",
  };
  return map[mimetype] || "";
}

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
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

function handleDocumentMulterError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(AppError.badRequest("Document file size must not exceed 20MB"));
    }
    return next(AppError.badRequest(err.message));
  }
  next(err);
}

module.exports = {
  upload,
  uploadDocument,
  handleMulterError,
  handleDocumentMulterError,
  UPLOAD_DOCUMENTS_DIR,
  UPLOADS_BASE_DIR,
};

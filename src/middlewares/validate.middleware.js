const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");

function validate(req, _res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));

    return next(AppError.badRequest("Validation failed", formatted));
  }

  next();
}

module.exports = { validate };

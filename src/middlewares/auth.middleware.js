const { verifyAccessToken } = require("../utils/jwt.util");
const AppError = require("../utils/AppError");
const roleRepository = require("../repositories/role.repository");

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

/**
 * Role-based authorization middleware.
 * Must be used after `authenticate`.
 *
 * Usage:
 *   router.get("/admin/data", authenticate, authorize("admin"), handler)
 *   router.get("/content", authenticate, authorize("admin", "creator"), handler)
 */
function authorize(...allowedRoles) {
  return async (req, _res, next) => {
    try {
      const roles = await roleRepository.findActiveRolesByUserId(req.user.userId);
      const roleCodes = roles.map((r) => r.role_code);

      const hasPermission = allowedRoles.some((role) => roleCodes.includes(role));
      if (!hasPermission) {
        return next(AppError.forbidden("You do not have permission to access this resource"));
      }

      req.user.roles = roleCodes;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, authorize };

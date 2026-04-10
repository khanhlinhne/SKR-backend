const { authenticate, authorize } = require("./auth.middleware");
const config = require("../config");

/**
 * Skip JWT + role for GET /api/admin/dashboard when:
 * - `ADMIN_DASHBOARD_OPEN=true` (or `1`), or
 * - `NODE_ENV` is **development** (default local run)
 *
 * Force auth even in development: `ADMIN_DASHBOARD_OPEN=false`
 *
 * Production (`NODE_ENV=production`) still requires Bearer unless you explicitly set `ADMIN_DASHBOARD_OPEN=true`.
 */
function isDashboardOpen() {
  const raw = process.env.ADMIN_DASHBOARD_OPEN?.trim() ?? "";
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  return config.nodeEnv === "development";
}

function skipDashboardAuthIfOpen(req, res, next) {
  if (isDashboardOpen()) {
    return next();
  }
  return authenticate(req, res, next);
}

function skipDashboardAuthorizeIfOpen(req, res, next) {
  if (isDashboardOpen()) {
    return next();
  }
  return authorize("admin", "staff")(req, res, next);
}

module.exports = { skipDashboardAuthIfOpen, skipDashboardAuthorizeIfOpen, isDashboardOpen };

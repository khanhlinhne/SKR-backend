module.exports = function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền truy cập tài nguyên này" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền truy cập tài nguyên này" });
    }

    next();
  };
};


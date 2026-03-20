const prisma = require("../config/prisma");

const roleRepository = {
  async findActiveRolesByUserId(userId) {
    const userRoles = await prisma.mst_user_roles.findMany({
      where: {
        user_id: userId,
        is_active: true,
        OR: [
          { expires_at_utc: null },
          { expires_at_utc: { gt: new Date() } },
        ],
      },
      include: {
        mst_roles: true,
      },
    });

    return userRoles
      .filter((ur) => ur.mst_roles?.is_active)
      .map((ur) => ur.mst_roles);
  },

  async findByCodes(roleCodes) {
    return prisma.mst_roles.findMany({
      where: {
        role_code: { in: roleCodes },
        is_active: true,
      },
    });
  },

  async findByIds(roleIds) {
    return prisma.mst_roles.findMany({
      where: {
        role_id: { in: roleIds },
        is_active: true,
      },
    });
  },
};

module.exports = roleRepository;

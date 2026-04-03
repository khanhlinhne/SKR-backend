const prisma = require("../config/prisma");

const userRepository = {
  async findById(userId) {
    return prisma.mst_users.findUnique({
      where: { user_id: userId },
    });
  },

  async findByIdWithRoles(userId) {
    return prisma.mst_users.findUnique({
      where: { user_id: userId },
      include: {
        mst_user_roles: {
          where: {
            is_active: true,
            OR: [
              { expires_at_utc: null },
              { expires_at_utc: { gt: new Date() } },
            ],
          },
          include: {
            mst_roles: true,
          },
        },
      },
    });
  },

  async findByEmail(email) {
    return prisma.mst_users.findUnique({
      where: { email },
    });
  },

  async findByUsername(username) {
    return prisma.mst_users.findUnique({
      where: { username },
    });
  },

  async create(data) {
    const user = await prisma.mst_users.create({
      data: {
        email: data.email,
        username: data.username,
        password_hash: data.passwordHash || null,
        full_name: data.fullName || null,
        display_name: data.displayName || null,
        avatar_url: data.avatarUrl || null,
        phone_number: data.phoneNumber ?? null,
        timezone_offset: data.timezoneOffset ?? 7,
        email_verified: data.emailVerified || false,
        created_by: data.createdBy || "00000000-0000-0000-0000-000000000000",
      },
    });

    if (user.created_by === "00000000-0000-0000-0000-000000000000") {
      await prisma.mst_users.update({
        where: { user_id: user.user_id },
        data: { created_by: user.user_id },
      });
    }

    return user;
  },

  async update(userId, data, updatedByUserId) {
    return prisma.mst_users.update({
      where: { user_id: userId },
      data: {
        ...data,
        updated_by: updatedByUserId ?? userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async findMany({ where, orderBy, skip, take }) {
    const [items, totalItems] = await prisma.$transaction([
      prisma.mst_users.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          mst_user_roles: {
            where: {
              is_active: true,
              OR: [
                { expires_at_utc: null },
                { expires_at_utc: { gt: new Date() } },
              ],
            },
            include: { mst_roles: true },
          },
        },
      }),
      prisma.mst_users.count({ where }),
    ]);

    return { items, totalItems };
  },

  async assignRoles(userId, roleIds, createdBy) {
    // Deactivate existing roles first
    await prisma.mst_user_roles.updateMany({
      where: { user_id: userId, is_active: true },
      data: { is_active: false, updated_by: createdBy, updated_at_utc: new Date() },
    });

    // Create new role assignments
    const assignments = roleIds.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
      created_by: createdBy,
      is_active: true,
    }));

    if (assignments.length > 0) {
      await prisma.mst_user_roles.createMany({ data: assignments });
    }
  },

  async updateLastLogin(userId) {
    return prisma.mst_users.update({
      where: { user_id: userId },
      data: {
        last_login_at_utc: new Date(),
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },
};

module.exports = userRepository;

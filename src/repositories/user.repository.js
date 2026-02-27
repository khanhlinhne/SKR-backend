const prisma = require("../config/prisma");

const userRepository = {
  async findById(userId) {
    return prisma.mst_users.findUnique({
      where: { user_id: userId },
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

  async update(userId, data) {
    return prisma.mst_users.update({
      where: { user_id: userId },
      data: {
        ...data,
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
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

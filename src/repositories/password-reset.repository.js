const prisma = require("../config/prisma");

const passwordResetRepository = {
  async create({ userId, email, token, expiresAt }) {
    return prisma.usr_password_resets.create({
      data: {
        user_id: userId,
        email,
        reset_token: token,
        token_expires_at_utc: expiresAt,
        created_by: userId,
      },
    });
  },

  async findByToken(token) {
    return prisma.usr_password_resets.findUnique({
      where: { reset_token: token },
    });
  },

  async markAsUsed(resetId) {
    return prisma.usr_password_resets.update({
      where: { reset_id: resetId },
      data: {
        used_at_utc: new Date(),
        status: "used",
      },
    });
  },

  async invalidateAllByUserId(userId) {
    return prisma.usr_password_resets.updateMany({
      where: {
        user_id: userId,
        status: "pending",
      },
      data: { status: "expired" },
    });
  },

  async findLatestPendingByUserId(userId) {
    return prisma.usr_password_resets.findFirst({
      where: {
        user_id: userId,
        status: "pending",
        token_expires_at_utc: { gt: new Date() },
      },
      orderBy: { created_at_utc: "desc" },
    });
  },
};

module.exports = passwordResetRepository;

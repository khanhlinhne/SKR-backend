const prisma = require("../config/prisma");

const tokenRepository = {
  async create({ userId, token, expiresAt }) {
    return prisma.usr_refresh_tokens.create({
      data: {
        user_id: userId,
        token,
        expires_at_utc: expiresAt,
        created_by: userId,
      },
    });
  },

  async findByToken(token) {
    return prisma.usr_refresh_tokens.findUnique({
      where: { token },
    });
  },

  async revokeByToken(token) {
    return prisma.usr_refresh_tokens.update({
      where: { token },
      data: {
        revoked_at_utc: new Date(),
        status: "revoked",
      },
    });
  },

  async revokeAllByUserId(userId) {
    return prisma.usr_refresh_tokens.updateMany({
      where: {
        user_id: userId,
        revoked_at_utc: null,
        status: "active",
      },
      data: {
        revoked_at_utc: new Date(),
        status: "revoked",
      },
    });
  },
};

module.exports = tokenRepository;

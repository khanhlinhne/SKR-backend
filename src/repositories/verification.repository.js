const prisma = require("../config/prisma");

const verificationRepository = {
  async create({ userId, email, token, expiresAt }) {
    return prisma.usr_email_verifications.create({
      data: {
        user_id: userId,
        email,
        verification_token: token,
        token_expires_at_utc: expiresAt,
        created_by: userId,
      },
    });
  },

  async findByToken(token) {
    return prisma.usr_email_verifications.findUnique({
      where: { verification_token: token },
    });
  },

  async findLatestPendingByUserId(userId) {
    return prisma.usr_email_verifications.findFirst({
      where: {
        user_id: userId,
        status: "pending",
        token_expires_at_utc: { gt: new Date() },
      },
      orderBy: { created_at_utc: "desc" },
    });
  },

  async markAsVerified(verificationId) {
    return prisma.usr_email_verifications.update({
      where: { verification_id: verificationId },
      data: {
        verified_at_utc: new Date(),
        status: "verified",
      },
    });
  },

  async invalidateAllByUserId(userId) {
    return prisma.usr_email_verifications.updateMany({
      where: {
        user_id: userId,
        status: "pending",
      },
      data: {
        status: "expired",
      },
    });
  },
};

module.exports = verificationRepository;

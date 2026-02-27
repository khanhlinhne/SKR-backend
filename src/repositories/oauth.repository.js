const prisma = require("../config/prisma");

const oauthRepository = {
  async findByProviderAndProviderId(provider, providerUserId) {
    return prisma.usr_oauth_connections.findUnique({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: providerUserId,
        },
      },
    });
  },

  async findByUserId(userId) {
    return prisma.usr_oauth_connections.findMany({
      where: { user_id: userId },
    });
  },

  async create({ userId, provider, providerUserId, providerEmail, providerData, createdBy }) {
    return prisma.usr_oauth_connections.create({
      data: {
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
        provider_email: providerEmail || null,
        provider_data: providerData || null,
        created_by: createdBy,
      },
    });
  },
};

module.exports = oauthRepository;

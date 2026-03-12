const prisma = require("../config/prisma");

const settingRepository = {
  async findMany({ where, orderBy, skip, take }) {
    const [items, totalItems] = await prisma.$transaction([
      prisma.adm_settings.findMany({ where, orderBy, skip, take }),
      prisma.adm_settings.count({ where }),
    ]);

    return { items, totalItems };
  },

  async findById(settingId) {
    return prisma.adm_settings.findUnique({
      where: { setting_id: settingId },
    });
  },

  async findByKey(settingKey) {
    return prisma.adm_settings.findUnique({
      where: { setting_key: settingKey },
    });
  },

  async create(data) {
    return prisma.adm_settings.create({ data });
  },

  async update(settingId, data) {
    return prisma.adm_settings.update({
      where: { setting_id: settingId },
      data,
    });
  },

  async softDelete(settingId, userId) {
    return prisma.adm_settings.update({
      where: { setting_id: settingId },
      data: {
        is_active: false,
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },
};

module.exports = settingRepository;

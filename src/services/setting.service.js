const AppError = require("../utils/AppError");
const settingRepository = require("../repositories/setting.repository");
const settingDto = require("../dtos/setting.dto");

const settingService = {
  async getSettings(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = { is_active: true };

    if (query.search) {
      where.OR = [
        { setting_key: { contains: query.search, mode: "insensitive" } },
        { setting_label: { contains: query.search, mode: "insensitive" } },
        { setting_description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.group) {
      where.setting_group = query.group;
    }

    if (query.isPublic !== undefined && query.isPublic !== "") {
      where.is_public = query.isPublic === "true";
    }

    const orderBy = [
      { setting_group: "asc" },
      { display_order: "asc" },
    ];

    const { items, totalItems } = await settingRepository.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map(settingDto.toItem),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  async getSettingDetail(settingId) {
    const setting = await settingRepository.findById(settingId);

    if (!setting || !setting.is_active) {
      throw AppError.notFound("Setting not found");
    }

    return settingDto.toItem(setting);
  },

  async createSetting(data, userId) {
    const existing = await settingRepository.findByKey(data.settingKey);
    if (existing) {
      throw AppError.conflict(`Setting key "${data.settingKey}" already exists`);
    }

    const created = await settingRepository.create({
      setting_key: data.settingKey,
      setting_value: data.settingValue !== undefined ? String(data.settingValue) : null,
      setting_type: data.settingType || "string",
      setting_group: data.settingGroup || "general",
      setting_label: data.settingLabel,
      setting_description: data.settingDescription || null,
      is_public: data.isPublic ?? false,
      display_order: data.displayOrder ?? 0,
      created_by: userId,
    });

    return settingDto.toItem(created);
  },

  async updateSetting(settingId, data, userId) {
    const setting = await settingRepository.findById(settingId);

    if (!setting || !setting.is_active) {
      throw AppError.notFound("Setting not found");
    }

    const updateData = { updated_by: userId, updated_at_utc: new Date() };

    if (data.settingValue !== undefined) {
      updateData.setting_value = data.settingValue !== null ? String(data.settingValue) : null;
    }
    if (data.settingType !== undefined) updateData.setting_type = data.settingType;
    if (data.settingGroup !== undefined) updateData.setting_group = data.settingGroup;
    if (data.settingLabel !== undefined) updateData.setting_label = data.settingLabel;
    if (data.settingDescription !== undefined) updateData.setting_description = data.settingDescription;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;

    const updated = await settingRepository.update(settingId, updateData);
    return settingDto.toItem(updated);
  },

  async deleteSetting(settingId, userId) {
    const setting = await settingRepository.findById(settingId);

    if (!setting || !setting.is_active) {
      throw AppError.notFound("Setting not found");
    }

    await settingRepository.softDelete(settingId, userId);
  },
};

module.exports = settingService;

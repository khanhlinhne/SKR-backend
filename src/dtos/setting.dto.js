function toItem(setting) {
  return {
    settingId: setting.setting_id,
    settingKey: setting.setting_key,
    settingValue: castValue(setting.setting_value, setting.setting_type),
    settingType: setting.setting_type,
    settingGroup: setting.setting_group,
    settingLabel: setting.setting_label,
    settingDescription: setting.setting_description,
    isPublic: setting.is_public,
    displayOrder: setting.display_order,
    isActive: setting.is_active,
    createdAt: setting.created_at_utc,
    updatedAt: setting.updated_at_utc,
  };
}

function castValue(value, type) {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "number":
      return Number(value);
    case "boolean":
      return value === "true" || value === true;
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

module.exports = { toItem };

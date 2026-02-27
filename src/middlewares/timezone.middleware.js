const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function formatTimezoneOffset(offsetHours) {
  const sign = offsetHours >= 0 ? "+" : "-";
  const abs = Math.abs(offsetHours);
  const hours = String(Math.floor(abs)).padStart(2, "0");
  const minutes = String(Math.round((abs % 1) * 60)).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function convertToTimezone(value, offsetHours) {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    const localMs = value.getTime() + offsetHours * 3_600_000;
    const local = new Date(localMs);
    return local.toISOString().replace("Z", formatTimezoneOffset(offsetHours));
  }

  if (typeof value === "string" && ISO_DATE_REGEX.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const localMs = date.getTime() + offsetHours * 3_600_000;
      const local = new Date(localMs);
      return local.toISOString().replace("Z", formatTimezoneOffset(offsetHours));
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => convertToTimezone(item, offsetHours));
  }

  if (typeof value === "object") {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = convertToTimezone(val, offsetHours);
    }
    return result;
  }

  return value;
}

/**
 * Intercepts res.json() and converts all UTC datetime fields
 * to the user's local timezone.
 *
 * Timezone offset is resolved in this order:
 *   1. X-Timezone-Offset header (allows per-request override)
 *   2. req.user.timezoneOffset (from JWT payload for authenticated requests)
 *   3. Default: 0 (UTC)
 */
function timezoneConverter(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const headerOffset = req.headers["x-timezone-offset"];
    const offset =
      headerOffset !== undefined
        ? parseFloat(headerOffset)
        : req.user?.timezoneOffset ?? 0;

    if (offset !== 0 && body && typeof body === "object") {
      body = convertToTimezone(body, offset);
    }

    return originalJson(body);
  };

  next();
}

module.exports = { timezoneConverter };

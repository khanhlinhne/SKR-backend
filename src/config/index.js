require("dotenv").config();

/** Empty / auto / latest → resolve newest Flash via Gemini models.list API */
function geminiModelFromEnv() {
  const raw = process.env.GEMINI_MODEL;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return "auto";
  }
  const t = String(raw).trim().toLowerCase();
  if (t === "auto" || t === "latest") {
    return "auto";
  }
  return String(raw).trim();
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
  },

  mail: {
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
  },

  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES, 10) || 10,
  },

  imgbb: {
    apiKey: process.env.IMGBB_API_KEY,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    /** "auto" = pick newest gemini-*-flash from models.list (see ai-gemini.service) */
    model: geminiModelFromEnv(),
    /**
     * UUID of an existing mst_users row. When set, POST /generate-questions without Bearer
     * still persists rows under this user so GET /generations lists them for everyone.
     */
    publicGenerationOwnerUserId: process.env.AI_PUBLIC_GENERATION_OWNER_USER_ID?.trim() || null,
  },
};

module.exports = config;

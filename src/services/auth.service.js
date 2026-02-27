const bcrypt = require("bcryptjs");
const config = require("../config");
const AppError = require("../utils/AppError");
const jwtUtil = require("../utils/jwt.util");
const userRepository = require("../repositories/user.repository");
const tokenRepository = require("../repositories/token.repository");
const verificationRepository = require("../repositories/verification.repository");
const emailService = require("./email.service");
const authDto = require("../dtos/auth.dto");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOtpExpiresAt() {
  return new Date(Date.now() + config.otp.expiresInMinutes * 60 * 1000);
}

async function generateAndStoreTokens(user) {
  const accessToken = jwtUtil.generateAccessToken({
    userId: user.user_id,
    email: user.email,
    timezoneOffset: user.timezone_offset ?? 0,
  });

  const refreshToken = jwtUtil.generateRefreshToken();
  const expiresAt = jwtUtil.getRefreshTokenExpiresAt();

  await tokenRepository.create({
    userId: user.user_id,
    token: refreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

const authService = {
  async register({ email, username, password, timezoneOffset }) {
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw AppError.conflict("Email already exists");
    }

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      throw AppError.conflict("Username already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      email,
      username,
      passwordHash,
      timezoneOffset,
    });

    await verificationRepository.invalidateAllByUserId(user.user_id);

    const otp = generateOtp();
    await verificationRepository.create({
      userId: user.user_id,
      email,
      token: otp,
      expiresAt: getOtpExpiresAt(),
    });

    await emailService.sendVerificationOtp(email, otp);

    return { user: authDto.toUserResponse(user) };
  },

  async verifyEmail({ email, otp }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (user.email_verified) {
      throw AppError.badRequest("Email is already verified");
    }

    const verification = await verificationRepository.findByToken(otp);

    if (!verification || verification.user_id !== user.user_id) {
      throw AppError.badRequest("Invalid OTP");
    }

    if (verification.status !== "pending") {
      throw AppError.badRequest("OTP has already been used");
    }

    if (new Date() > verification.token_expires_at_utc) {
      throw AppError.badRequest("OTP has expired");
    }

    await verificationRepository.markAsVerified(verification.verification_id);
    await userRepository.update(user.user_id, { email_verified: true });

    return { message: "Email verified successfully" };
  },

  async resendOtp({ email }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (user.email_verified) {
      throw AppError.badRequest("Email is already verified");
    }

    const recent = await verificationRepository.findLatestPendingByUserId(user.user_id);
    if (recent) {
      const cooldown = 60 * 1000;
      const elapsed = Date.now() - new Date(recent.created_at_utc).getTime();
      if (elapsed < cooldown) {
        const waitSeconds = Math.ceil((cooldown - elapsed) / 1000);
        throw AppError.badRequest(`Please wait ${waitSeconds}s before requesting a new OTP`);
      }
    }

    await verificationRepository.invalidateAllByUserId(user.user_id);

    const otp = generateOtp();
    await verificationRepository.create({
      userId: user.user_id,
      email,
      token: otp,
      expiresAt: getOtpExpiresAt(),
    });

    await emailService.sendVerificationOtp(email, otp);

    return { message: "OTP sent successfully" };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    if (!user.is_active) {
      throw AppError.forbidden("Account has been deactivated");
    }

    if (!user.email_verified) {
      throw AppError.forbidden("Please verify your email before logging in");
    }

    if (!user.password_hash) {
      throw AppError.badRequest("This account uses social login. Please login with Google.");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw AppError.unauthorized("Invalid email or password");
    }

    await userRepository.updateLastLogin(user.user_id);

    const tokens = await generateAndStoreTokens(user);

    return authDto.toLoginResponse(user, tokens);
  },

  async refreshToken({ refreshToken }) {
    const stored = await tokenRepository.findByToken(refreshToken);

    if (!stored || stored.status !== "active" || stored.revoked_at_utc) {
      throw AppError.unauthorized("Invalid refresh token");
    }

    if (new Date() > stored.expires_at_utc) {
      await tokenRepository.revokeByToken(refreshToken);
      throw AppError.unauthorized("Refresh token has expired");
    }

    await tokenRepository.revokeByToken(refreshToken);

    const user = await userRepository.findById(stored.user_id);
    if (!user || !user.is_active) {
      throw AppError.unauthorized("User not found or deactivated");
    }

    const tokens = await generateAndStoreTokens(user);

    return authDto.toTokenResponse(tokens);
  },

  async logout({ refreshToken }) {
    const stored = await tokenRepository.findByToken(refreshToken);

    if (stored && stored.status === "active") {
      await tokenRepository.revokeByToken(refreshToken);
    }

    return { message: "Logged out successfully" };
  },

  async handleGoogleAuth(user) {
    if (!user.is_active) {
      throw AppError.forbidden("Account has been deactivated");
    }

    await userRepository.updateLastLogin(user.user_id);

    const tokens = await generateAndStoreTokens(user);

    return authDto.toLoginResponse(user, tokens);
  },
};

module.exports = authService;

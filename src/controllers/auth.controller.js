const authService = require("../services/auth.service");
const { success } = require("../utils/response.util");
const config = require("../config");

const authController = {
  async register(req, res, next) {
    try {
      const data = await authService.register(req.body);
      return success(res, {
        statusCode: 201,
        message: "Registration successful. Please check your email for the verification OTP.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const data = await authService.verifyEmail(req.body);
      return success(res, { message: data.message });
    } catch (err) {
      next(err);
    }
  },

  async resendOtp(req, res, next) {
    try {
      const data = await authService.resendOtp(req.body);
      return success(res, { message: data.message });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const data = await authService.login(req.body);
      return success(res, { message: "Login successful", data });
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const data = await authService.refreshToken(req.body);
      return success(res, { message: "Token refreshed", data });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const data = await authService.logout(req.body);
      return success(res, { message: data.message });
    } catch (err) {
      next(err);
    }
  },

  googleLogin(req, res, next) {
    const passport = require("../config/passport");
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })(req, res, next);
  },

  googleCallback(req, res, next) {
    const passport = require("../config/passport");
    passport.authenticate("google", { session: false }, async (err, user) => {
      try {
        if (err || !user) {
          return res.redirect(`${config.clientUrl}/auth/error?message=Google authentication failed`);
        }

        const data = await authService.handleGoogleAuth(user);
        const params = new URLSearchParams({
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
        });

        return res.redirect(`${config.clientUrl}/auth/callback?${params.toString()}`);
      } catch (error) {
        next(error);
      }
    })(req, res, next);
  },
};

module.exports = authController;

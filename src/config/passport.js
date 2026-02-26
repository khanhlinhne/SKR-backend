const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { v4: uuidv4 } = require("uuid");
const UserModel = require("../models/user.model");

/*
  Passport Google OAuth 2.0 Strategy
  -----------------------------------
  Flow:
  1. User click "Đăng nhập bằng Google" → redirect tới Google
  2. Google xác thực → gọi callback URL với profile
  3. Strategy callback tìm/tạo user trong DB
  4. done(null, user) trả user cho route handler
*/

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Không lấy được email từ Google"), null);
        }

        const googleId = profile.id;

        // 1. Tìm user bằng google_id trước (đã liên kết trước đó)
        let user = await UserModel.findByGoogleId(googleId);
        if (user) {
          return done(null, user);
        }

        // 2. Tìm user bằng email (có thể đã đăng ký bằng email/password)
        user = await UserModel.findByEmail(email);
        if (user) {
          // Liên kết Google vào tài khoản cũ
          user = await UserModel.linkGoogleAccount(user.user_id, googleId);
          return done(null, user);
        }

        // 3. Tạo user mới hoàn toàn
        const userId = uuidv4();
        user = await UserModel.createGoogleUser({
          userId,
          email,
          googleId,
          displayName: profile.displayName,
        });

        return done(null, user);
      } catch (error) {
        console.error("GOOGLE STRATEGY ERROR:", error);
        return done(error, null);
      }
    },
  ),
);

module.exports = passport;
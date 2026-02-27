const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const config = require("./index");
const userRepository = require("../repositories/user.repository");
const oauthRepository = require("../repositories/oauth.repository");

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails[0].value;
        const displayName = profile.displayName || email.split("@")[0];
        const avatarUrl = profile.photos?.[0]?.value || null;

        const existingOauth = await oauthRepository.findByProviderAndProviderId("google", googleId);

        if (existingOauth) {
          const user = await userRepository.findById(existingOauth.user_id);
          return done(null, user);
        }

        let user = await userRepository.findByEmail(email);

        if (user) {
          await oauthRepository.create({
            userId: user.user_id,
            provider: "google",
            providerUserId: googleId,
            providerEmail: email,
            providerData: { displayName, avatarUrl },
            createdBy: user.user_id,
          });

          if (!user.email_verified) {
            await userRepository.update(user.user_id, {
              email_verified: true,
              avatar_url: user.avatar_url || avatarUrl,
            });
          }
        } else {
          user = await userRepository.create({
            email,
            username: `${displayName.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`,
            display_name: displayName,
            avatar_url: avatarUrl,
            email_verified: true,
          });

          await oauthRepository.create({
            userId: user.user_id,
            provider: "google",
            providerUserId: googleId,
            providerEmail: email,
            providerData: { displayName, avatarUrl },
            createdBy: user.user_id,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

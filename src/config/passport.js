const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../db/connect");

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// Nếu chưa cấu hình Google OAuth thì bỏ qua, tránh crash server
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "[AUTH] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET chưa được cấu hình, bỏ qua Google OAuth"
  );
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails[0].value;

        let user = await pool.query(
          "SELECT * FROM users WHERE email=$1",
          [email]
        );

        if (user.rows.length === 0) {
          user = await pool.query(
            `INSERT INTO users(email, google_id, auth_provider, role)
             VALUES($1,$2,$3,$4)
             RETURNING *`,
            [email, profile.id, "google", "user"]
          );
        }

        return done(null, user.rows[0]);
      }
    )
  );
}
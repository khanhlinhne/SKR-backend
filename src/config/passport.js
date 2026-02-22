const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../db/connect");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
          "INSERT INTO users(email, google_id, auth_provider) VALUES($1,$2,$3) RETURNING *",
          [email, profile.id, "google"]
        );
      }

      return done(null, user.rows[0]);
    }
  )
);
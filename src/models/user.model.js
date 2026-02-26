const pool = require("../db/connect");

/**
 * Tìm user theo username HOẶC email.
 * Trả về row đầy đủ hoặc null nếu không tìm thấy.
 * @param {string|null} username
 * @param {string|null} email
 * @returns {Promise<object|null>}
 */
const findByEmailOrUsername = async (username, email) => {
  const result = await pool.query(
    "SELECT * FROM mst_users WHERE username=$1 OR email=$2",
    [username ?? null, email ?? null],
  );
  return result.rows[0] ?? null;
};

/**
 * Tìm user theo email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const findByEmail = async (email) => {
  const result = await pool.query(
    "SELECT * FROM mst_users WHERE email=$1",
    [email],
  );
  return result.rows[0] ?? null;
};

/**
 * Tìm user theo google_id.
 * @param {string} googleId
 * @returns {Promise<object|null>}
 */
const findByGoogleId = async (googleId) => {
  const result = await pool.query(
    "SELECT * FROM mst_users WHERE google_id=$1",
    [googleId],
  );
  return result.rows[0] ?? null;
};

/**
 * Tạo user mới trong bảng mst_users.
 * @param {object} params
 * @param {string} params.userId        - UUID mới sinh
 * @param {string} params.username
 * @param {string} params.email
 * @param {string} params.hashedPassword - Đã hash bằng bcrypt
 */
const createUser = async ({ userId, username, email, hashedPassword }) => {
  await pool.query(
    `INSERT INTO mst_users (
      user_id,
      username,
      email,
      password_hash,
      auth_provider,
      timezone_offset,
      is_active,
      email_verified,
      created_by,
      created_at_utc,
      updated_by,
      updated_at_utc
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10,NOW())`,
    [
      userId,
      username,
      email,
      hashedPassword,
      "local",     // auth_provider
      0,           // timezone_offset
      true,        // is_active
      false,       // email_verified
      userId,      // created_by (self-reference)
      userId,      // updated_by
    ],
  );
};

/**
 * Tạo user mới từ Google OAuth.
 * Không cần password, lưu google_id và auth_provider = 'google'.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.email
 * @param {string} params.googleId
 * @param {string} [params.displayName]
 */
const createGoogleUser = async ({ userId, email, googleId, displayName }) => {
  const result = await pool.query(
    `INSERT INTO mst_users (
      user_id,
      username,
      email,
      google_id,
      auth_provider,
      timezone_offset,
      is_active,
      email_verified,
      created_by,
      created_at_utc,
      updated_by,
      updated_at_utc
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10,NOW())
    RETURNING *`,
    [
      userId,
      displayName || email.split("@")[0], // username fallback
      email,
      googleId,
      "google",   // auth_provider
      0,          // timezone_offset
      true,       // is_active
      true,       // email_verified (Google đã xác thực)
      userId,     // created_by
      userId,     // updated_by
    ],
  );
  return result.rows[0];
};

/**
 * Liên kết Google ID vào user đã tồn tại (đăng ký bằng email trước đó).
 * @param {string} userId
 * @param {string} googleId
 * @returns {Promise<object>}
 */
const linkGoogleAccount = async (userId, googleId) => {
  const result = await pool.query(
    `UPDATE mst_users
     SET google_id      = $1,
         auth_provider  = CASE
                            WHEN auth_provider = 'local' THEN 'both'
                            ELSE auth_provider
                          END,
         email_verified = true,
         updated_at_utc = NOW(),
         updated_by     = $2
     WHERE user_id = $2
     RETURNING *`,
    [googleId, userId],
  );
  return result.rows[0];
};

/**
 * Cập nhật thời điểm đăng nhập cuối.
 * @param {string} userId
 */
const updateLastLogin = async (userId) => {
  await pool.query(
    `UPDATE mst_users
     SET last_login_at_utc = NOW(),
         updated_at_utc    = NOW(),
         updated_by        = $1
     WHERE user_id = $1`,
    [userId],
  );
};

module.exports = {
  findByEmailOrUsername,
  findByEmail,
  findByGoogleId,
  createUser,
  createGoogleUser,
  linkGoogleAccount,
  updateLastLogin,
};

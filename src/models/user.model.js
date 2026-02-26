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
      timezone_offset,
      is_active,
      email_verified,
      created_by,
      created_at_utc,
      updated_by,
      updated_at_utc
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,NOW())`,
    [
      userId,
      username,
      email,
      hashedPassword,
      0, // timezone_offset
      true, // is_active
      false, // email_verified
      userId, // created_by (self-reference)
      userId, // updated_by
    ],
  );
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
  createUser,
  updateLastLogin,
};

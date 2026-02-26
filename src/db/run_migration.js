require("dotenv").config();
const pool = require("./connect");

async function runMigration() {
    try {
        console.log("Đang chạy migration...");

        await pool.query(`
      ALTER TABLE mst_users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE DEFAULT NULL
    `);
        console.log("✅ Thêm column google_id");

        await pool.query(`
      ALTER TABLE mst_users
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local'
    `);
        console.log("✅ Thêm column auth_provider");

        await pool.query(`
      ALTER TABLE mst_users
      ALTER COLUMN password_hash DROP NOT NULL
    `);
        console.log("✅ Cho phép password_hash = NULL");

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mst_users_google_id ON mst_users(google_id)
    `);
        console.log("✅ Tạo index google_id");

        console.log("\n🎉 Migration hoàn tất!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration lỗi:", error.message);
        process.exit(1);
    }
}

runMigration();

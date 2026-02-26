-- =============================================
-- Migration: Thêm các column cho Google OAuth
-- Chạy script này trên database SKRSystem
-- =============================================

-- 1. Thêm column google_id (Google account ID)
ALTER TABLE mst_users
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE DEFAULT NULL;

-- 2. Thêm column auth_provider ('local', 'google', 'both')
ALTER TABLE mst_users
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';

-- 3. Cho phép password_hash = NULL (user đăng ký bằng Google không cần password)
ALTER TABLE mst_users
ALTER COLUMN password_hash DROP NOT NULL;

-- 4. Tạo index cho google_id để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_mst_users_google_id ON mst_users(google_id);

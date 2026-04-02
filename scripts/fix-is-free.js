/**
 * Script fix dữ liệu cũ: khóa học có price_amount > 0 nhưng is_free = true
 * Chạy: node scripts/fix-is-free.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const prisma = require("../src/config/prisma");

async function main() {
  const result = await prisma.mst_courses.updateMany({
    where: {
      is_free: true,
      price_amount: {
        gt: 0,
      },
    },
    data: {
      is_free: false,
    },
  });

  console.log(`✅ Đã cập nhật ${result.count} khóa học: is_free = false (vì price_amount > 0)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  });

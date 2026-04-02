/**
 * Seed script: Cập nhật dữ liệu học viên, đánh giá cho các khóa học
 * và tạo bản ghi purchases + orders cho doanh thu.
 *
 * Chạy: node prisma/seed-course-data.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { PrismaClient } = require(path.resolve(__dirname, "..", "node_modules", "@prisma/client"));

const prisma = new PrismaClient();

// ─── Dữ liệu demo cho từng khóa học ──────────────────────────────────

const COURSE_DEMO_DATA = {
  "AI & Machine Learning": { students: 156, rating: 4.8, ratingCount: 89 },
  "TypeScript Masterclass": { students: 234, rating: 4.7, ratingCount: 142 },
  "DevOps & Docker": { students: 189, rating: 4.6, ratingCount: 98 },
  "Cấu trúc dữ liệu": { students: 312, rating: 4.9, ratingCount: 201 },
  "React.js": { students: 478, rating: 4.8, ratingCount: 287 },
  "Backend": { students: 267, rating: 4.7, ratingCount: 156 },
  "Node.js": { students: 267, rating: 4.7, ratingCount: 156 },
  "Cơ sở dữ liệu": { students: 198, rating: 4.5, ratingCount: 112 },
  "PostgreS": { students: 198, rating: 4.5, ratingCount: 112 },
  "Phát triển Web Frontend": { students: 356, rating: 4.8, ratingCount: 198 },
  "Web Frontend": { students: 356, rating: 4.8, ratingCount: 198 },
  "Git & GitHub": { students: 892, rating: 4.9, ratingCount: 534 },
  "Nhập môn Lập trình": { students: 1247, rating: 4.7, ratingCount: 678 },
  "Nhập môn": { students: 1247, rating: 4.7, ratingCount: 678 },
};

function matchCourse(courseName) {
  const name = courseName.toLowerCase();
  for (const [key, data] of Object.entries(COURSE_DEMO_DATA)) {
    if (name.includes(key.toLowerCase())) return data;
  }
  return { students: 85, rating: 4.5, ratingCount: 42 };
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startDays, endDays) {
  const now = new Date();
  const start = new Date(now.getTime() - startDays * 86400000);
  const end = new Date(now.getTime() - endDays * 86400000);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function genOrderCode() {
  return "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const REVIEWS = [
  "Khóa học rất hay và bổ ích!",
  "Giảng viên giảng dạy dễ hiểu.",
  "Tuyệt vời! Rất đáng để đầu tư.",
  "Nội dung thực tế, áp dụng ngay.",
  "Bài giảng chi tiết, nhiều ví dụ.",
  "Nâng cao kỹ năng rất nhiều.",
  "Chất lượng xuất sắc!",
];

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n========================================");
  console.log("  SEED: Cap nhat du lieu hoc vien & doanh thu");
  console.log("========================================\n");

  // 1. Lấy tất cả khóa học
  const courses = await prisma.mst_courses.findMany({
    where: { is_active: true },
    select: {
      course_id: true,
      course_name: true,
      course_code: true,
      price_amount: true,
      is_free: true,
      creator_id: true,
    },
  });

  console.log(`Tim thay ${courses.length} khoa hoc.\n`);
  if (courses.length === 0) return;

  // 2. Lấy users
  const users = await prisma.mst_users.findMany({
    where: { is_active: true },
    select: { user_id: true, full_name: true, email: true },
    take: 30,
  });

  console.log(`Tim thay ${users.length} users.\n`);
  if (users.length === 0) return;

  // ──── BƯỚC 1: Cập nhật purchase_count + rating cho TẤT CẢ courses ────
  console.log("--- BUOC 1: Cap nhat purchase_count, rating ---\n");

  for (const course of courses) {
    const data = matchCourse(course.course_name);
    await prisma.mst_courses.update({
      where: { course_id: course.course_id },
      data: {
        purchase_count: data.students,
        rating_average: data.rating,
        rating_count: data.ratingCount,
      },
    });
    console.log(`  [OK] ${course.course_name} -> ${data.students} hoc vien, ${data.rating} sao`);
  }

  console.log("\n--- BUOC 2: Tao orders + purchases ---\n");

  // ──── BƯỚC 2: Tạo orders + purchases (batch, tối đa 5 mỗi course) ────
  let totalOrders = 0;
  let totalPurchases = 0;

  for (const course of courses) {
    // Kiểm tra đã có purchases chưa
    const existingCount = await prisma.pmt_course_purchases.count({
      where: { course_id: course.course_id },
    });

    if (existingCount > 0) {
      console.log(`  [SKIP] ${course.course_name}: Da co ${existingCount} purchases`);
      continue;
    }

    const priceAmount = Number(course.price_amount || 0);
    const isFree = course.is_free || priceAmount === 0;
    const numPurchases = Math.min(5, users.length); // Chỉ tạo 5 bản ghi mỗi khóa
    const selectedUsers = [...users].sort(() => Math.random() - 0.5).slice(0, numPurchases);

    for (const buyer of selectedUsers) {
      const purchaseDate = randomDate(180, 1);
      const actualPrice = isFree ? 0 : priceAmount;

      try {
        // Tạo order + order_item + transaction + purchase cùng lúc
        const order = await prisma.pmt_orders.create({
          data: {
            order_code: genOrderCode(),
            user_id: buyer.user_id,
            order_type: "course_purchase",
            item_count: 1,
            subtotal_amount: actualPrice,
            discount_amount: 0,
            tax_amount: 0,
            total_amount: actualPrice,
            currency_code: "VND",
            customer_email: buyer.email,
            customer_name: buyer.full_name || "Hoc vien",
            payment_status: "completed",
            paid_at_utc: purchaseDate,
            created_by: buyer.user_id,
            created_at_utc: purchaseDate,
            pmt_order_items: {
              create: {
                item_type: "course",
                item_id: course.course_id,
                item_name: course.course_name,
                unit_price: actualPrice,
                quantity: 1,
                discount_amount: 0,
                line_total: actualPrice,
                created_by: buyer.user_id,
                created_at_utc: purchaseDate,
              },
            },
            pmt_transactions: {
              create: {
                user_id: buyer.user_id,
                transaction_type: "payment",
                amount: actualPrice,
                currency_code: "VND",
                payment_method: isFree ? "free" : "bank_transfer",
                payment_status: "completed",
                paid_at_utc: purchaseDate,
                created_by: buyer.user_id,
                created_at_utc: purchaseDate,
              },
            },
            pmt_course_purchases: {
              create: {
                course_id: course.course_id,
                user_id: buyer.user_id,
                purchased_at_utc: purchaseDate,
                purchase_type: isFree ? "free" : "purchased",
                purchase_price: actualPrice,
                currency_code: "VND",
                access_start_utc: purchaseDate,
                is_lifetime_access: true,
                progress_percent: randomBetween(10, 100),
                chapters_completed: randomBetween(0, 5),
                lessons_completed: randomBetween(0, 15),
                last_accessed_at_utc: randomDate(30, 0),
                user_rating: Math.random() > 0.3 ? randomBetween(3, 5) : null,
                user_review: Math.random() > 0.3 ? REVIEWS[randomBetween(0, 6)] : null,
                created_by: buyer.user_id,
                created_at_utc: purchaseDate,
                status: "active",
              },
            },
          },
        });
        totalOrders++;
        totalPurchases++;
      } catch (err) {
        if (err.code === "P2002") continue; // unique constraint
        // Skip silently
      }
    }

    console.log(`  [OK] ${course.course_name}: Tao ${numPurchases} don hang`);
  }

  // ──── Tổng kết ────
  console.log("\n========================================");
  console.log("  KET QUA SEED:");
  console.log(`  - Khoa hoc cap nhat: ${courses.length}`);
  console.log(`  - Don hang tao:      ${totalOrders}`);
  console.log(`  - Purchases tao:     ${totalPurchases}`);
  console.log("========================================");
  console.log("\nHoan tat! Du lieu da duoc cap nhat vao database.\n");
}

main()
  .catch((e) => {
    console.error("\nLoi khi seed du lieu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

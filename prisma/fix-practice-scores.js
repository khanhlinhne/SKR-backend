/**
 * Fix script: Reset best_score và average_score về null
 * cho các lrn_practice_tests đang lưu điểm thô (raw points)
 * thay vì phần trăm (%).
 *
 * Sau khi reset, user cần thi lại để cập nhật đúng.
 * Chạy: node prisma/fix-practice-scores.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { PrismaClient } = require(path.resolve(__dirname, "..", "node_modules", "@prisma/client"));

const prisma = new PrismaClient();

async function main() {
  console.log("\n========================================");
  console.log("  FIX: Reset best_score / average_score");
  console.log("========================================\n");

  // Tìm tất cả practice tests có best_score < 1
  // (điểm thô thường nhỏ hơn 20, nhưng % thì 0-100)
  // Nếu best_score <= 20 và attempts_count > 0 thì rất có thể là điểm thô
  const suspectTests = await prisma.lrn_practice_tests.findMany({
    where: {
      status: "active",
      attempts_count: { gt: 0 },
      best_score: { lte: 20 }, // điểm % hợp lệ > 20 nếu từng đúng câu nào
    },
    select: {
      practice_test_id: true,
      test_title: true,
      best_score: true,
      average_score: true,
      attempts_count: true,
      total_questions: true,
    },
  });

  console.log("Tim thay " + suspectTests.length + " bai thi co the bi sai score.\n");

  let fixed = 0;
  for (const t of suspectTests) {
    console.log(
      "  RESET: " + t.test_title +
      " | best=" + (t.best_score ? Number(t.best_score).toFixed(2) : null) +
      " | attempts=" + t.attempts_count +
      " | total_q=" + t.total_questions
    );

    await prisma.lrn_practice_tests.update({
      where: { practice_test_id: t.practice_test_id },
      data: {
        best_score: null,
        average_score: null,
        attempts_count: 0,
        last_attempt_at_utc: null,
        updated_at_utc: new Date(),
      },
    });
    fixed++;
  }

  console.log("\nDa reset " + fixed + " bai thi.");
  console.log("User can thi lai de cap nhat diem dung.\n");

  console.log("========================================");
  console.log("  HOAN TAT!");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error("Loi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

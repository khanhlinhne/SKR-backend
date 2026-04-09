/**
 * Seed script: Tạo dữ liệu mẫu cho tính năng Thi Thử (Quiz Practice)
 * 
 * Tạo data cho TẤT CẢ user active trong hệ thống:
 * - 20 câu hỏi (cnt_questions) với multiple_choice và true_false
 * - 5 bài thi thử (lrn_practice_tests) cho mỗi user chưa có data
 *
 * Chạy: node prisma/seed-quiz-data.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { PrismaClient } = require(path.resolve(__dirname, "..", "node_modules", "@prisma/client"));

const prisma = new PrismaClient();

// ─── Dữ liệu câu hỏi mẫu ──────────────────────────────────────────

const QUESTIONS = [
  // ======== MULTIPLE CHOICE - Lập trình Web ========
  {
    question_type: "multiple_choice",
    question_text: "Ngôn ngữ lập trình nào được sử dụng chủ yếu để phát triển ứng dụng web phía client?",
    question_explanation: "JavaScript là ngôn ngữ lập trình phổ biến nhất cho phát triển web phía client (frontend). Nó cho phép tạo các tương tác động trên trang web.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "Python", is_correct: false, option_order: 1, option_explanation: "Python thường dùng cho backend, data science, AI/ML" },
      { option_text: "JavaScript", is_correct: true, option_order: 2, option_explanation: "JavaScript chạy trực tiếp trên trình duyệt web" },
      { option_text: "C++", is_correct: false, option_order: 3, option_explanation: "C++ chủ yếu dùng cho lập trình hệ thống, game" },
      { option_text: "Java", is_correct: false, option_order: 4, option_explanation: "Java dùng cho lập trình Android, server-side" },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "React.js là gì?",
    question_explanation: "React.js là một thư viện JavaScript do Facebook phát triển, được sử dụng để xây dựng giao diện người dùng (UI) cho các ứng dụng web.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "Một hệ quản trị cơ sở dữ liệu", is_correct: false, option_order: 1 },
      { option_text: "Một thư viện JavaScript để xây dựng giao diện người dùng", is_correct: true, option_order: 2 },
      { option_text: "Một ngôn ngữ lập trình mới", is_correct: false, option_order: 3 },
      { option_text: "Một framework CSS", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "CSS viết tắt của cụm từ nào?",
    question_explanation: "CSS (Cascading Style Sheets) là ngôn ngữ dùng để mô tả cách trình bày của tài liệu HTML.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "Cascading Style Sheets", is_correct: true, option_order: 1 },
      { option_text: "Creative Style System", is_correct: false, option_order: 2 },
      { option_text: "Computer Style Sheets", is_correct: false, option_order: 3 },
      { option_text: "Colorful Style Syntax", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Trong HTML, thẻ nào dùng để tạo liên kết?",
    question_explanation: "Thẻ <a> (anchor) trong HTML được sử dụng để tạo liên kết đến trang web, file hoặc phần tử khác.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "<link>", is_correct: false, option_order: 1 },
      { option_text: "<a>", is_correct: true, option_order: 2 },
      { option_text: "<href>", is_correct: false, option_order: 3 },
      { option_text: "<url>", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Node.js sử dụng engine nào để thực thi mã JavaScript?",
    question_explanation: "Node.js sử dụng V8 JavaScript engine của Google Chrome để thực thi mã JavaScript phía server.",
    difficulty_level: "medium",
    points: 2,
    options: [
      { option_text: "SpiderMonkey", is_correct: false, option_order: 1, option_explanation: "SpiderMonkey là engine của Firefox" },
      { option_text: "V8", is_correct: true, option_order: 2, option_explanation: "V8 là engine JavaScript của Google Chrome" },
      { option_text: "Chakra", is_correct: false, option_order: 3, option_explanation: "Chakra là engine cũ của Microsoft Edge" },
      { option_text: "JavaScriptCore", is_correct: false, option_order: 4, option_explanation: "JavaScriptCore là engine của Safari" },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Phương thức HTTP nào được sử dụng để tạo mới tài nguyên?",
    question_explanation: "POST thường được sử dụng để gửi dữ liệu lên server và tạo mới một tài nguyên.",
    difficulty_level: "medium",
    points: 2,
    options: [
      { option_text: "GET", is_correct: false, option_order: 1 },
      { option_text: "POST", is_correct: true, option_order: 2 },
      { option_text: "PUT", is_correct: false, option_order: 3, option_explanation: "PUT dùng để cập nhật toàn bộ tài nguyên" },
      { option_text: "DELETE", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Trong SQL, mệnh đề nào dùng để lọc kết quả truy vấn?",
    question_explanation: "WHERE là mệnh đề trong SQL dùng để lọc các bản ghi theo điều kiện cụ thể.",
    difficulty_level: "medium",
    points: 2,
    options: [
      { option_text: "FILTER", is_correct: false, option_order: 1 },
      { option_text: "HAVING", is_correct: false, option_order: 2, option_explanation: "HAVING dùng để lọc kết quả sau GROUP BY" },
      { option_text: "WHERE", is_correct: true, option_order: 3 },
      { option_text: "SELECT", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Git là gì?",
    question_explanation: "Git là hệ thống quản lý phiên bản phân tán (Distributed Version Control System), được tạo bởi Linus Torvalds.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "Một ngôn ngữ lập trình", is_correct: false, option_order: 1 },
      { option_text: "Hệ thống quản lý phiên bản phân tán", is_correct: true, option_order: 2 },
      { option_text: "Một trình duyệt web", is_correct: false, option_order: 3 },
      { option_text: "Một hệ điều hành", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Trong JavaScript, keyword nào dùng để khai báo biến không thay đổi giá trị?",
    question_explanation: "const được sử dụng để khai báo biến có giá trị không thể được gán lại sau khi khởi tạo.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "var", is_correct: false, option_order: 1 },
      { option_text: "let", is_correct: false, option_order: 2 },
      { option_text: "const", is_correct: true, option_order: 3 },
      { option_text: "static", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "REST API sử dụng định dạng dữ liệu nào phổ biến nhất?",
    question_explanation: "JSON (JavaScript Object Notation) là định dạng dữ liệu nhẹ, dễ đọc và phổ biến nhất khi làm việc với REST API.",
    difficulty_level: "medium",
    points: 2,
    options: [
      { option_text: "XML", is_correct: false, option_order: 1 },
      { option_text: "JSON", is_correct: true, option_order: 2 },
      { option_text: "YAML", is_correct: false, option_order: 3 },
      { option_text: "CSV", is_correct: false, option_order: 4 },
    ],
  },
  // ======== MULTIPLE CHOICE - Nâng cao ========
  {
    question_type: "multiple_choice",
    question_text: "Design Pattern nào thuộc nhóm Creational?",
    question_explanation: "Singleton thuộc nhóm Creational Design Patterns, đảm bảo rằng một class chỉ có duy nhất một instance.",
    difficulty_level: "hard",
    points: 3,
    options: [
      { option_text: "Observer", is_correct: false, option_order: 1, option_explanation: "Observer thuộc nhóm Behavioral" },
      { option_text: "Adapter", is_correct: false, option_order: 2, option_explanation: "Adapter thuộc nhóm Structural" },
      { option_text: "Singleton", is_correct: true, option_order: 3 },
      { option_text: "Strategy", is_correct: false, option_order: 4, option_explanation: "Strategy thuộc nhóm Behavioral" },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Thuật toán tìm kiếm nhị phân có độ phức tạp thời gian là bao nhiêu?",
    question_explanation: "Binary Search có độ phức tạp O(log n) vì mỗi bước loại bỏ một nửa phần tử còn lại.",
    difficulty_level: "hard",
    points: 3,
    options: [
      { option_text: "O(n)", is_correct: false, option_order: 1 },
      { option_text: "O(n squared)", is_correct: false, option_order: 2 },
      { option_text: "O(log n)", is_correct: true, option_order: 3 },
      { option_text: "O(1)", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Docker container khác với Virtual Machine (VM) ở điểm nào?",
    question_explanation: "Docker container chia sẻ kernel của hệ điều hành host, trong khi VM có kernel riêng. Điều này khiến container nhẹ hơn và khởi động nhanh hơn.",
    difficulty_level: "hard",
    points: 3,
    options: [
      { option_text: "Container chạy trên hardware riêng", is_correct: false, option_order: 1 },
      { option_text: "Container chia sẻ kernel OS của host", is_correct: true, option_order: 2 },
      { option_text: "Container không hỗ trợ networking", is_correct: false, option_order: 3 },
      { option_text: "Container và VM giống hệt nhau", is_correct: false, option_order: 4 },
    ],
  },
  {
    question_type: "multiple_choice",
    question_text: "Microservices Architecture có ưu điểm chính nào?",
    question_explanation: "Microservices cho phép từng service được phát triển, triển khai và scale độc lập, tăng tính linh hoạt của hệ thống.",
    difficulty_level: "hard",
    points: 3,
    options: [
      { option_text: "Giảm chi phí server", is_correct: false, option_order: 1 },
      { option_text: "Don gian hoa code", is_correct: false, option_order: 2 },
      { option_text: "Scale va trien khai doc lap tung service", is_correct: true, option_order: 3 },
      { option_text: "Khong can database", is_correct: false, option_order: 4 },
    ],
  },
  // ======== TRUE/FALSE ========
  {
    question_type: "true_false",
    question_text: "HTML la mot ngon ngu lap trinh.",
    question_explanation: "Sai. HTML (HyperText Markup Language) la ngon ngu danh dau, khong phai ngon ngu lap trinh. No dung de cau truc noi dung trang web.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "Dung", is_correct: false, option_order: 1 },
      { option_text: "Sai", is_correct: true, option_order: 2 },
    ],
  },
  {
    question_type: "true_false",
    question_text: "JavaScript co the chay ca o phia client va phia server.",
    question_explanation: "Dung! JavaScript ban dau chi chay tren trinh duyet (client), nhung voi Node.js, JavaScript co the chay ca phia server.",
    difficulty_level: "easy",
    points: 1,
    options: [
      { option_text: "Dung", is_correct: true, option_order: 1 },
      { option_text: "Sai", is_correct: false, option_order: 2 },
    ],
  },
  {
    question_type: "true_false",
    question_text: "SQL Injection la mot loai tan cong bao mat web pho bien.",
    question_explanation: "Dung. SQL Injection la ky thuat tan cong pho bien, ke tan cong chen ma SQL doc hai vao input de truy cap du lieu trai phep.",
    difficulty_level: "medium",
    points: 2,
    options: [
      { option_text: "Dung", is_correct: true, option_order: 1 },
      { option_text: "Sai", is_correct: false, option_order: 2 },
    ],
  },
  {
    question_type: "true_false",
    question_text: "TCP la giao thuc khong dang tin cay (unreliable).",
    question_explanation: "Sai. TCP (Transmission Control Protocol) la giao thuc tin cay (reliable). UDP moi la giao thuc unreliable.",
    difficulty_level: "medium",
    points: 2,
    options: [
      { option_text: "Dung", is_correct: false, option_order: 1 },
      { option_text: "Sai", is_correct: true, option_order: 2 },
    ],
  },
  {
    question_type: "true_false",
    question_text: "Lenh 'git pull' chi tai code tu remote ma khong merge vao nhanh hien tai.",
    question_explanation: "Sai. 'git pull' = 'git fetch' + 'git merge'. No vua tai tu remote vua tu dong merge vao nhanh hien tai.",
    difficulty_level: "medium",
    points: 2,
    options: [
      { option_text: "Dung", is_correct: false, option_order: 1 },
      { option_text: "Sai", is_correct: true, option_order: 2 },
    ],
  },
  {
    question_type: "true_false",
    question_text: "NoSQL database luon tot hon SQL database.",
    question_explanation: "Sai. Khong co loai database nao luon tot hon. SQL tot cho du lieu co cau truc, quan he phuc tap. NoSQL tot cho du lieu linh hoat, scale ngang.",
    difficulty_level: "hard",
    points: 3,
    options: [
      { option_text: "Dung", is_correct: false, option_order: 1 },
      { option_text: "Sai", is_correct: true, option_order: 2 },
    ],
  },
];

// ─── Bài thi thử mẫu ──────────────────────────────────────────

const PRACTICE_TESTS = [
  {
    test_title: "Kiem tra kien thuc Lap trinh Web co ban",
    test_description: "Bai thi tong hop kien thuc nen tang ve HTML, CSS, JavaScript va cac cong nghe web co ban. Phu hop cho nguoi moi bat dau.",
    difficulty_levels: ["easy"],
    question_types: ["multiple_choice", "true_false"],
    total_questions: 5,
    time_limit_minutes: 10,
    randomize_questions: true,
    randomize_options: true,
    show_correct_answers: true,
  },
  {
    test_title: "Thu thach JavaScript Nang cao",
    test_description: "Kiem tra kien thuc chuyen sau ve JavaScript, Node.js, REST API va cac cong nghe backend hien dai.",
    difficulty_levels: ["medium", "hard"],
    question_types: ["multiple_choice"],
    total_questions: 5,
    time_limit_minutes: 15,
    randomize_questions: true,
    randomize_options: true,
    show_correct_answers: true,
  },
  {
    test_title: "On tap Git & DevOps",
    test_description: "Bai thi ve quy trinh quan ly phien ban voi Git, CI/CD, Docker va cac cong cu DevOps hien dai.",
    difficulty_levels: ["medium"],
    question_types: ["multiple_choice", "true_false"],
    total_questions: 5,
    time_limit_minutes: 12,
    randomize_questions: false,
    randomize_options: true,
    show_correct_answers: true,
  },
  {
    test_title: "Tong hop kien thuc Backend",
    test_description: "Bai thi danh gia kien thuc ve Node.js, REST API, SQL, bao mat web va kien truc he thong phia server.",
    difficulty_levels: ["easy", "medium", "hard"],
    question_types: ["multiple_choice", "true_false"],
    total_questions: 10,
    time_limit_minutes: 25,
    randomize_questions: true,
    randomize_options: true,
    show_correct_answers: true,
  },
  {
    test_title: "Mini Quiz - Nhanh tri CNTT",
    test_description: "Bai thi nhanh voi cac cau hoi dung/sai ve kien thuc CNTT tong quat. Khong gioi han thoi gian, phu hop de on luyen.",
    difficulty_levels: ["easy", "medium"],
    question_types: ["true_false"],
    total_questions: 5,
    time_limit_minutes: null,
    randomize_questions: true,
    randomize_options: false,
    show_correct_answers: true,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n========================================");
  console.log("  SEED: Tao du lieu Thi Thu (Quiz)");
  console.log("========================================\n");

  // 1. Lấy tất cả users active
  const allUsers = await prisma.mst_users.findMany({
    where: { is_active: true },
    select: { user_id: true, email: true, full_name: true },
    orderBy: { created_at_utc: "asc" },
  });

  if (allUsers.length === 0) {
    console.error("Khong tim thay user nao! Hay tao user truoc.");
    process.exit(1);
  }

  const seedUser = allUsers[0]; // dùng user đầu tiên để tạo câu hỏi
  console.log("Tim thay " + allUsers.length + " users active.\n");

  // 2. Kiểm tra câu hỏi active
  const existingQuestions = await prisma.cnt_questions.count({
    where: { status: "active" },
  });

  console.log("Cau hoi active hien tai: " + existingQuestions + "\n");

  // 3. Tạo câu hỏi nếu chưa đủ 10
  let createdQuestions = 0;
  if (existingQuestions < 10) {
    console.log("--- Tao cau hoi moi ---\n");

    for (const q of QUESTIONS) {
      try {
        await prisma.cnt_questions.create({
          data: {
            question_type: q.question_type,
            question_text: q.question_text,
            question_explanation: q.question_explanation,
            difficulty_level: q.difficulty_level,
            points: q.points,
            time_limit_seconds: null,
            creator_id: seedUser.user_id,
            visibility: "public",
            status: "active",
            created_by: seedUser.user_id,
            cnt_question_options: {
              create: q.options.map((opt) => ({
                option_text: opt.option_text,
                option_order: opt.option_order,
                is_correct: opt.is_correct,
                option_explanation: opt.option_explanation || null,
                created_by: seedUser.user_id,
                status: "active",
              })),
            },
          },
        });
        createdQuestions++;
        console.log("  [OK] " + q.question_text.substring(0, 55) + "...");
      } catch (err) {
        console.error("  [ERR] " + q.question_text.substring(0, 40) + " - " + err.message);
      }
    }

    console.log("\nTao thanh cong " + createdQuestions + " cau hoi.\n");
  } else {
    console.log("Da co du cau hoi active, bo qua.\n");
  }

  // 4. Tạo practice tests cho TẤT CẢ users active
  console.log("--- Tao bai thi thu cho tung user ---\n");

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const u of allUsers) {
    const existingPractices = await prisma.lrn_practice_tests.count({
      where: { user_id: u.user_id, status: "active" },
    });

    if (existingPractices > 0) {
      console.log("  [SKIP] " + u.email + " - da co " + existingPractices + " bai thi");
      totalSkipped++;
      continue;
    }

    console.log("  [CREATE] " + u.email + " (" + (u.full_name || "N/A") + ")");

    for (const pt of PRACTICE_TESTS) {
      try {
        await prisma.lrn_practice_tests.create({
          data: {
            user_id: u.user_id,
            test_title: pt.test_title,
            test_description: pt.test_description,
            difficulty_levels: pt.difficulty_levels,
            question_types: pt.question_types,
            total_questions: pt.total_questions,
            time_limit_minutes: pt.time_limit_minutes,
            randomize_questions: pt.randomize_questions,
            randomize_options: pt.randomize_options,
            show_correct_answers: pt.show_correct_answers,
            attempts_count: 0,
            best_score: null,
            average_score: null,
            last_attempt_at_utc: null,
            status: "active",
            created_by: u.user_id,
          },
        });
        totalCreated++;
        console.log("    [OK] " + pt.test_title);
      } catch (err) {
        console.error("    [ERR] " + pt.test_title + " - " + err.message);
      }
    }
  }

  // ──── Tổng kết ────
  const totalQuestions = await prisma.cnt_questions.count({ where: { status: "active" } });
  const totalPractices = await prisma.lrn_practice_tests.count({ where: { status: "active" } });

  console.log("\n========================================");
  console.log("  KET QUA SEED:");
  console.log("  - Tong cau hoi active:      " + totalQuestions);
  console.log("  - Tong bai thi thu active:   " + totalPractices);
  console.log("  - Bai thi tao moi:           " + totalCreated);
  console.log("  - User bo qua (da co data):  " + totalSkipped);
  console.log("========================================");
  console.log("\nHoan tat! Moi user da co du lieu Thi Thu.\n");
}

main()
  .catch((e) => {
    console.error("\nLoi khi seed du lieu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

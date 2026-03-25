const prisma = require("../config/prisma");

const SEED_COURSES = [
  {
    courseCode: "CS-101",
    courseName: "Nhập môn Lập trình",
    courseDescription: "Khóa học cơ bản về lập trình dành cho người mới bắt đầu, bao gồm tư duy logic và các khái niệm nền tảng.",
    isFree: true,
    estimatedDurationHours: 40,
    chapters: [
      {
        chapterCode: "CS101-CH01",
        chapterName: "Giới thiệu về Lập trình",
        lessons: [
          { lessonCode: "CS101-CH01-LS01", lessonName: "Lập trình là gì?", learningObjectives: "Hiểu khái niệm lập trình và ứng dụng thực tế" },
          { lessonCode: "CS101-CH01-LS02", lessonName: "Cài đặt môi trường phát triển", learningObjectives: "Cài đặt IDE và công cụ cần thiết" },
          { lessonCode: "CS101-CH01-LS03", lessonName: "Chương trình Hello World đầu tiên", learningObjectives: "Viết và chạy chương trình đầu tiên" },
        ],
      },
      {
        chapterCode: "CS101-CH02",
        chapterName: "Biến và Kiểu dữ liệu",
        lessons: [
          { lessonCode: "CS101-CH02-LS01", lessonName: "Khai báo biến", learningObjectives: "Hiểu cách khai báo và sử dụng biến" },
          { lessonCode: "CS101-CH02-LS02", lessonName: "Các kiểu dữ liệu cơ bản", learningObjectives: "Phân biệt string, number, boolean" },
          { lessonCode: "CS101-CH02-LS03", lessonName: "Ép kiểu và chuyển đổi dữ liệu", learningObjectives: "Chuyển đổi giữa các kiểu dữ liệu" },
        ],
      },
      {
        chapterCode: "CS101-CH03",
        chapterName: "Cấu trúc điều khiển",
        lessons: [
          { lessonCode: "CS101-CH03-LS01", lessonName: "Câu lệnh if-else", learningObjectives: "Sử dụng câu lệnh điều kiện" },
          { lessonCode: "CS101-CH03-LS02", lessonName: "Vòng lặp for và while", learningObjectives: "Hiểu và sử dụng vòng lặp" },
          { lessonCode: "CS101-CH03-LS03", lessonName: "Switch-case và toán tử logic", learningObjectives: "Sử dụng switch-case hiệu quả" },
        ],
      },
    ],
  },
  {
    courseCode: "WEB-201",
    courseName: "Phát triển Web Frontend",
    courseDescription: "Học HTML, CSS và JavaScript để xây dựng giao diện web chuyên nghiệp và responsive.",
    isFree: false,
    priceAmount: 499000,
    originalPrice: 799000,
    discountPercent: 37,
    estimatedDurationHours: 60,
    chapters: [
      {
        chapterCode: "WEB201-CH01",
        chapterName: "HTML5 Cơ bản",
        lessons: [
          { lessonCode: "WEB201-CH01-LS01", lessonName: "Cấu trúc trang HTML", learningObjectives: "Hiểu cấu trúc cơ bản của HTML" },
          { lessonCode: "WEB201-CH01-LS02", lessonName: "Thẻ và thuộc tính HTML", learningObjectives: "Sử dụng các thẻ HTML phổ biến" },
          { lessonCode: "WEB201-CH01-LS03", lessonName: "Form và Input", learningObjectives: "Tạo form nhập liệu" },
        ],
      },
      {
        chapterCode: "WEB201-CH02",
        chapterName: "CSS3 và Responsive Design",
        lessons: [
          { lessonCode: "WEB201-CH02-LS01", lessonName: "CSS Selector và Box Model", learningObjectives: "Hiểu CSS selector và box model" },
          { lessonCode: "WEB201-CH02-LS02", lessonName: "Flexbox Layout", learningObjectives: "Sử dụng Flexbox để bố trí layout" },
          { lessonCode: "WEB201-CH02-LS03", lessonName: "Media Queries và Responsive", learningObjectives: "Tạo trang web responsive" },
        ],
      },
      {
        chapterCode: "WEB201-CH03",
        chapterName: "JavaScript cơ bản",
        lessons: [
          { lessonCode: "WEB201-CH03-LS01", lessonName: "DOM Manipulation", learningObjectives: "Thao tác với DOM" },
          { lessonCode: "WEB201-CH03-LS02", lessonName: "Xử lý sự kiện", learningObjectives: "Gắn và xử lý event listener" },
          { lessonCode: "WEB201-CH03-LS03", lessonName: "Fetch API và AJAX", learningObjectives: "Gọi API từ frontend" },
        ],
      },
    ],
  },
  {
    courseCode: "DB-301",
    courseName: "Cơ sở dữ liệu với PostgreSQL",
    courseDescription: "Nắm vững SQL, thiết kế database, tối ưu truy vấn và quản trị PostgreSQL.",
    isFree: false,
    priceAmount: 599000,
    estimatedDurationHours: 45,
    chapters: [
      {
        chapterCode: "DB301-CH01",
        chapterName: "SQL Cơ bản",
        lessons: [
          { lessonCode: "DB301-CH01-LS01", lessonName: "SELECT, INSERT, UPDATE, DELETE", learningObjectives: "Thực hiện các thao tác CRUD cơ bản" },
          { lessonCode: "DB301-CH01-LS02", lessonName: "WHERE, ORDER BY, GROUP BY", learningObjectives: "Lọc và sắp xếp dữ liệu" },
          { lessonCode: "DB301-CH01-LS03", lessonName: "JOIN giữa các bảng", learningObjectives: "Kết hợp dữ liệu từ nhiều bảng" },
        ],
      },
      {
        chapterCode: "DB301-CH02",
        chapterName: "Thiết kế Database",
        lessons: [
          { lessonCode: "DB301-CH02-LS01", lessonName: "Mô hình ER Diagram", learningObjectives: "Vẽ và đọc ER Diagram" },
          { lessonCode: "DB301-CH02-LS02", lessonName: "Chuẩn hóa dữ liệu (Normalization)", learningObjectives: "Áp dụng các dạng chuẩn 1NF, 2NF, 3NF" },
        ],
      },
      {
        chapterCode: "DB301-CH03",
        chapterName: "PostgreSQL nâng cao",
        lessons: [
          { lessonCode: "DB301-CH03-LS01", lessonName: "Index và tối ưu truy vấn", learningObjectives: "Tạo index và tối ưu performance" },
          { lessonCode: "DB301-CH03-LS02", lessonName: "Transaction và ACID", learningObjectives: "Hiểu transaction isolation levels" },
        ],
      },
    ],
  },
  {
    courseCode: "NODE-401",
    courseName: "Backend với Node.js & Express",
    courseDescription: "Xây dựng RESTful API chuyên nghiệp với Node.js, Express.js và các best practices.",
    isFree: false,
    priceAmount: 699000,
    originalPrice: 999000,
    discountPercent: 30,
    estimatedDurationHours: 55,
    chapters: [
      {
        chapterCode: "NODE401-CH01",
        chapterName: "Node.js Fundamentals",
        lessons: [
          { lessonCode: "NODE401-CH01-LS01", lessonName: "Event Loop và Non-blocking I/O", learningObjectives: "Hiểu cách Node.js xử lý bất đồng bộ" },
          { lessonCode: "NODE401-CH01-LS02", lessonName: "Module System (CommonJS vs ESM)", learningObjectives: "Sử dụng require và import" },
          { lessonCode: "NODE401-CH01-LS03", lessonName: "File System và Stream", learningObjectives: "Đọc ghi file và xử lý stream" },
        ],
      },
      {
        chapterCode: "NODE401-CH02",
        chapterName: "Express.js REST API",
        lessons: [
          { lessonCode: "NODE401-CH02-LS01", lessonName: "Routing và Middleware", learningObjectives: "Tạo routes và sử dụng middleware" },
          { lessonCode: "NODE401-CH02-LS02", lessonName: "Xử lý Request & Response", learningObjectives: "Parse body, query params, headers" },
          { lessonCode: "NODE401-CH02-LS03", lessonName: "Error Handling", learningObjectives: "Xây dựng hệ thống xử lý lỗi tập trung" },
        ],
      },
      {
        chapterCode: "NODE401-CH03",
        chapterName: "Authentication & Security",
        lessons: [
          { lessonCode: "NODE401-CH03-LS01", lessonName: "JWT Authentication", learningObjectives: "Triển khai đăng nhập bằng JWT" },
          { lessonCode: "NODE401-CH03-LS02", lessonName: "Role-based Authorization", learningObjectives: "Phân quyền theo vai trò người dùng" },
        ],
      },
    ],
  },
  {
    courseCode: "REACT-501",
    courseName: "React.js từ cơ bản đến nâng cao",
    courseDescription: "Xây dựng ứng dụng SPA với React, React Router, State Management và các pattern phổ biến.",
    isFree: false,
    priceAmount: 799000,
    estimatedDurationHours: 70,
    isFeatured: true,
    chapters: [
      {
        chapterCode: "REACT501-CH01",
        chapterName: "React Cơ bản",
        lessons: [
          { lessonCode: "REACT501-CH01-LS01", lessonName: "JSX và Components", learningObjectives: "Hiểu JSX syntax và tạo component" },
          { lessonCode: "REACT501-CH01-LS02", lessonName: "Props và State", learningObjectives: "Truyền dữ liệu và quản lý state" },
          { lessonCode: "REACT501-CH01-LS03", lessonName: "Lifecycle và useEffect", learningObjectives: "Quản lý side effects trong component" },
        ],
      },
      {
        chapterCode: "REACT501-CH02",
        chapterName: "React Hooks nâng cao",
        lessons: [
          { lessonCode: "REACT501-CH02-LS01", lessonName: "useContext và useReducer", learningObjectives: "Quản lý state phức tạp" },
          { lessonCode: "REACT501-CH02-LS02", lessonName: "Custom Hooks", learningObjectives: "Tạo reusable hooks" },
          { lessonCode: "REACT501-CH02-LS03", lessonName: "useMemo và useCallback", learningObjectives: "Tối ưu performance với memoization" },
        ],
      },
      {
        chapterCode: "REACT501-CH03",
        chapterName: "React Router & State Management",
        lessons: [
          { lessonCode: "REACT501-CH03-LS01", lessonName: "React Router v6", learningObjectives: "Thiết lập routing cho SPA" },
          { lessonCode: "REACT501-CH03-LS02", lessonName: "Redux Toolkit", learningObjectives: "Quản lý global state với Redux" },
        ],
      },
    ],
  },
  {
    courseCode: "GIT-102",
    courseName: "Git & GitHub cho Developer",
    courseDescription: "Quản lý source code chuyên nghiệp với Git, GitHub workflow và CI/CD cơ bản.",
    isFree: true,
    estimatedDurationHours: 20,
    chapters: [
      {
        chapterCode: "GIT102-CH01",
        chapterName: "Git Cơ bản",
        lessons: [
          { lessonCode: "GIT102-CH01-LS01", lessonName: "Khởi tạo Repository", learningObjectives: "git init, git clone, git config" },
          { lessonCode: "GIT102-CH01-LS02", lessonName: "Staging, Commit và Log", learningObjectives: "git add, git commit, git log" },
          { lessonCode: "GIT102-CH01-LS03", lessonName: "Branching và Merging", learningObjectives: "Tạo branch, merge và resolve conflicts" },
        ],
      },
      {
        chapterCode: "GIT102-CH02",
        chapterName: "GitHub Workflow",
        lessons: [
          { lessonCode: "GIT102-CH02-LS01", lessonName: "Pull Request và Code Review", learningObjectives: "Tạo PR và review code" },
          { lessonCode: "GIT102-CH02-LS02", lessonName: "GitHub Actions cơ bản", learningObjectives: "Thiết lập CI/CD pipeline đơn giản" },
        ],
      },
    ],
  },
  {
    courseCode: "DSA-601",
    courseName: "Cấu trúc dữ liệu & Giải thuật",
    courseDescription: "Nắm vững các cấu trúc dữ liệu và thuật toán quan trọng cho phỏng vấn và phát triển phần mềm.",
    isFree: false,
    priceAmount: 899000,
    estimatedDurationHours: 80,
    isFeatured: true,
    chapters: [
      {
        chapterCode: "DSA601-CH01",
        chapterName: "Mảng và Chuỗi",
        lessons: [
          { lessonCode: "DSA601-CH01-LS01", lessonName: "Array Operations", learningObjectives: "Thao tác cơ bản trên mảng" },
          { lessonCode: "DSA601-CH01-LS02", lessonName: "Two Pointers & Sliding Window", learningObjectives: "Áp dụng kỹ thuật hai con trỏ" },
          { lessonCode: "DSA601-CH01-LS03", lessonName: "String Manipulation", learningObjectives: "Xử lý chuỗi hiệu quả" },
        ],
      },
      {
        chapterCode: "DSA601-CH02",
        chapterName: "Stack, Queue và Linked List",
        lessons: [
          { lessonCode: "DSA601-CH02-LS01", lessonName: "Stack Implementation", learningObjectives: "Cài đặt và ứng dụng Stack" },
          { lessonCode: "DSA601-CH02-LS02", lessonName: "Queue và Deque", learningObjectives: "Cài đặt và ứng dụng Queue" },
          { lessonCode: "DSA601-CH02-LS03", lessonName: "Linked List", learningObjectives: "Cài đặt Singly và Doubly Linked List" },
        ],
      },
      {
        chapterCode: "DSA601-CH03",
        chapterName: "Tree và Graph",
        lessons: [
          { lessonCode: "DSA601-CH03-LS01", lessonName: "Binary Tree & BST", learningObjectives: "Duyệt cây và thao tác trên BST" },
          { lessonCode: "DSA601-CH03-LS02", lessonName: "Graph BFS & DFS", learningObjectives: "Duyệt đồ thị theo chiều rộng và sâu" },
        ],
      },
    ],
  },
  {
    courseCode: "DEVOPS-701",
    courseName: "DevOps & Docker cho Developer",
    courseDescription: "Hiểu Docker, containerization, CI/CD pipeline và triển khai ứng dụng lên cloud.",
    isFree: false,
    priceAmount: 649000,
    estimatedDurationHours: 35,
    chapters: [
      {
        chapterCode: "DEVOPS701-CH01",
        chapterName: "Docker Fundamentals",
        lessons: [
          { lessonCode: "DEVOPS701-CH01-LS01", lessonName: "Container vs VM", learningObjectives: "Hiểu sự khác biệt container và VM" },
          { lessonCode: "DEVOPS701-CH01-LS02", lessonName: "Dockerfile và Docker Build", learningObjectives: "Viết Dockerfile và build image" },
          { lessonCode: "DEVOPS701-CH01-LS03", lessonName: "Docker Compose", learningObjectives: "Quản lý multi-container với Compose" },
        ],
      },
      {
        chapterCode: "DEVOPS701-CH02",
        chapterName: "CI/CD Pipeline",
        lessons: [
          { lessonCode: "DEVOPS701-CH02-LS01", lessonName: "GitHub Actions nâng cao", learningObjectives: "Xây dựng pipeline CI/CD hoàn chỉnh" },
          { lessonCode: "DEVOPS701-CH02-LS02", lessonName: "Deploy lên VPS", learningObjectives: "Triển khai ứng dụng lên server" },
        ],
      },
    ],
  },
  {
    courseCode: "TS-402",
    courseName: "TypeScript Masterclass",
    courseDescription: "Nâng cao kỹ năng JavaScript với TypeScript: types, generics, decorators và patterns.",
    isFree: false,
    priceAmount: 549000,
    estimatedDurationHours: 40,
    chapters: [
      {
        chapterCode: "TS402-CH01",
        chapterName: "TypeScript Cơ bản",
        lessons: [
          { lessonCode: "TS402-CH01-LS01", lessonName: "Types và Interfaces", learningObjectives: "Khai báo type và interface" },
          { lessonCode: "TS402-CH01-LS02", lessonName: "Union, Intersection và Literal Types", learningObjectives: "Sử dụng advanced types" },
          { lessonCode: "TS402-CH01-LS03", lessonName: "Enums và Type Guards", learningObjectives: "Sử dụng enum và narrowing" },
        ],
      },
      {
        chapterCode: "TS402-CH02",
        chapterName: "Generics & Utility Types",
        lessons: [
          { lessonCode: "TS402-CH02-LS01", lessonName: "Generic Functions & Classes", learningObjectives: "Viết code tái sử dụng với generics" },
          { lessonCode: "TS402-CH02-LS02", lessonName: "Partial, Pick, Omit, Record", learningObjectives: "Sử dụng built-in utility types" },
        ],
      },
      {
        chapterCode: "TS402-CH03",
        chapterName: "TypeScript trong dự án thực tế",
        lessons: [
          { lessonCode: "TS402-CH03-LS01", lessonName: "Cấu hình tsconfig.json", learningObjectives: "Thiết lập project TypeScript" },
          { lessonCode: "TS402-CH03-LS02", lessonName: "TypeScript với Express", learningObjectives: "Xây dựng API với TypeScript + Express" },
        ],
      },
    ],
  },
  {
    courseCode: "AI-801",
    courseName: "AI & Machine Learning cho người mới",
    courseDescription: "Giới thiệu trí tuệ nhân tạo, machine learning cơ bản và ứng dụng AI trong thực tế.",
    isFree: false,
    priceAmount: 999000,
    estimatedDurationHours: 50,
    isFeatured: true,
    chapters: [
      {
        chapterCode: "AI801-CH01",
        chapterName: "Giới thiệu AI & ML",
        lessons: [
          { lessonCode: "AI801-CH01-LS01", lessonName: "AI là gì? Lịch sử phát triển", learningObjectives: "Hiểu khái niệm và lịch sử AI" },
          { lessonCode: "AI801-CH01-LS02", lessonName: "Phân loại Machine Learning", learningObjectives: "Supervised, Unsupervised, Reinforcement" },
          { lessonCode: "AI801-CH01-LS03", lessonName: "Python cho Data Science", learningObjectives: "Sử dụng NumPy, Pandas cơ bản" },
        ],
      },
      {
        chapterCode: "AI801-CH02",
        chapterName: "Supervised Learning",
        lessons: [
          { lessonCode: "AI801-CH02-LS01", lessonName: "Linear Regression", learningObjectives: "Xây dựng mô hình hồi quy tuyến tính" },
          { lessonCode: "AI801-CH02-LS02", lessonName: "Classification với Decision Tree", learningObjectives: "Phân loại dữ liệu với cây quyết định" },
          { lessonCode: "AI801-CH02-LS03", lessonName: "Đánh giá mô hình", learningObjectives: "Accuracy, Precision, Recall, F1-Score" },
        ],
      },
      {
        chapterCode: "AI801-CH03",
        chapterName: "Ứng dụng AI thực tế",
        lessons: [
          { lessonCode: "AI801-CH03-LS01", lessonName: "ChatGPT API và Prompt Engineering", learningObjectives: "Sử dụng OpenAI API hiệu quả" },
          { lessonCode: "AI801-CH03-LS02", lessonName: "Xây dựng AI Chatbot đơn giản", learningObjectives: "Tạo chatbot với LLM" },
        ],
      },
    ],
  },
];

const migrationService = {
  async seedCourses() {
    const adminUser = await prisma.mst_users.findFirst({
      orderBy: { created_at_utc: "asc" },
    });

    if (!adminUser) {
      throw new Error("No user found in the database. Please create at least one user first.");
    }

    const createdBy = adminUser.user_id;
    const results = { created: 0, skipped: 0, details: [] };

    for (const courseData of SEED_COURSES) {
      const existing = await prisma.mst_courses.findUnique({
        where: { course_code: courseData.courseCode },
      });

      if (existing) {
        console.log(`Course ${courseData.courseCode} already exists, skipping...`);
        results.skipped++;
        results.details.push({ code: courseData.courseCode, status: "skipped" });
        continue;
      }

      const course = await prisma.mst_courses.create({
        data: {
          course_code: courseData.courseCode,
          course_name: courseData.courseName,
          course_description: courseData.courseDescription,
          is_free: courseData.isFree ?? true,
          price_amount: courseData.priceAmount ?? 0,
          original_price: courseData.originalPrice ?? null,
          currency_code: "VND",
          discount_percent: courseData.discountPercent ?? 0,
          estimated_duration_hours: courseData.estimatedDurationHours ?? null,
          is_featured: courseData.isFeatured ?? false,
          status: "published",
          published_at_utc: new Date(),
          creator_id: createdBy,
          created_by: createdBy,
        },
      });

      let totalLessons = 0;

      for (let ci = 0; ci < courseData.chapters.length; ci++) {
        const ch = courseData.chapters[ci];

        const chapter = await prisma.mst_chapters.create({
          data: {
            course_id: course.course_id,
            chapter_code: ch.chapterCode,
            chapter_name: ch.chapterName,
            chapter_number: ci + 1,
            display_order: ci + 1,
            estimated_duration_minutes: ch.lessons.length * 30,
            created_by: createdBy,
          },
        });

        for (let li = 0; li < ch.lessons.length; li++) {
          const ls = ch.lessons[li];

          await prisma.mst_lessons.create({
            data: {
              chapter_id: chapter.chapter_id,
              lesson_code: ls.lessonCode,
              lesson_name: ls.lessonName,
              lesson_description: ls.learningObjectives,
              lesson_number: li + 1,
              display_order: li + 1,
              learning_objectives: ls.learningObjectives,
              estimated_duration_minutes: 30,
              created_by: createdBy,
            },
          });

          totalLessons++;
        }
      }

      await prisma.mst_courses.update({
        where: { course_id: course.course_id },
        data: {
          total_chapters: courseData.chapters.length,
          total_lessons: totalLessons,
        },
      });

      console.log(`Created course: ${courseData.courseCode} (${courseData.chapters.length} chapters, ${totalLessons} lessons)`);
      results.created++;
      results.details.push({
        code: courseData.courseCode,
        status: "created",
        chapters: courseData.chapters.length,
        lessons: totalLessons,
      });
    }

    console.log(`\nMigration completed! Created: ${results.created}, Skipped: ${results.skipped}`);
    return results;
  },

  async seedFlashcards() {
    const adminUser = await prisma.mst_users.findFirst({
      orderBy: { created_at_utc: "asc" },
    });
    if (!adminUser) {
      throw new Error("No user found. Please create at least one user first.");
    }

    const createdBy = adminUser.user_id;
    const results = { created: 0, skipped: 0, details: [] };

    const flashcardSets = [
      {
        setTitle: "Từ vựng Lập trình cơ bản",
        setDescription: "Các thuật ngữ lập trình thường gặp dành cho người mới",
        courseCode: "CS-101",
        visibility: "public",
        tags: ["programming", "beginner", "vocabulary"],
        items: [
          { front: "Variable", back: "Biến - một vùng nhớ dùng để lưu trữ dữ liệu, có thể thay đổi giá trị trong quá trình chạy chương trình.", hint: "Bắt đầu bằng chữ V" },
          { front: "Function", back: "Hàm - một khối mã được đặt tên, có thể tái sử dụng, nhận đầu vào (parameters) và trả về kết quả.", hint: "Khối mã có thể gọi lại" },
          { front: "Loop", back: "Vòng lặp - cấu trúc cho phép thực thi một đoạn mã nhiều lần (for, while, do-while).", hint: "Lặp đi lặp lại" },
          { front: "Array", back: "Mảng - cấu trúc dữ liệu lưu trữ nhiều phần tử cùng kiểu theo chỉ mục (index).", hint: "Danh sách có thứ tự" },
          { front: "String", back: "Chuỗi - kiểu dữ liệu biểu diễn văn bản, là tập hợp các ký tự.", hint: "Kiểu dữ liệu cho text" },
          { front: "Boolean", back: "Kiểu luận lý - chỉ có hai giá trị: true (đúng) hoặc false (sai).", hint: "Đúng hoặc sai" },
          { front: "Object", back: "Đối tượng - tập hợp các cặp key-value, biểu diễn một thực thể với thuộc tính và phương thức.", hint: "Cặp key-value" },
          { front: "Condition (if-else)", back: "Câu lệnh điều kiện - kiểm tra một biểu thức, thực thi code khác nhau tùy kết quả true/false.", hint: "Rẽ nhánh" },
          { front: "Algorithm", back: "Thuật toán - tập hợp các bước hữu hạn, rõ ràng để giải quyết một bài toán cụ thể.", hint: "Các bước giải bài toán" },
          { front: "Bug", back: "Lỗi trong chương trình khiến phần mềm hoạt động không đúng như mong đợi.", hint: "Kẻ thù của developer" },
        ],
      },
      {
        setTitle: "HTML Tags phổ biến",
        setDescription: "Flashcard về các thẻ HTML thường dùng trong phát triển web",
        courseCode: "WEB-201",
        visibility: "public",
        tags: ["html", "web", "frontend"],
        items: [
          { front: "<div>", back: "Block container - thẻ chứa nội dung dạng block, dùng để nhóm và bố trí layout.", hint: "Division" },
          { front: "<span>", back: "Inline container - thẻ chứa nội dung dạng inline, dùng để style một phần text.", hint: "Inline element" },
          { front: "<a href=''>", back: "Anchor tag - tạo hyperlink liên kết đến trang khác hoặc vị trí trong trang.", hint: "Link" },
          { front: "<img src=''>", back: "Image tag - hiển thị hình ảnh. Là self-closing tag, cần thuộc tính src và alt.", hint: "Hình ảnh" },
          { front: "<form>", back: "Form tag - tạo biểu mẫu để thu thập dữ liệu từ người dùng (input, select, textarea).", hint: "Biểu mẫu nhập liệu" },
          { front: "<ul> / <ol>", back: "Unordered List / Ordered List - tạo danh sách không đánh số / có đánh số.", hint: "Danh sách" },
          { front: "<table>", back: "Table tag - tạo bảng dữ liệu với <tr> (row), <th> (header), <td> (cell).", hint: "Bảng dữ liệu" },
          { front: "<input type=''>", back: "Input tag - tạo trường nhập liệu. Các type phổ biến: text, password, email, number, checkbox.", hint: "Ô nhập liệu" },
        ],
      },
      {
        setTitle: "SQL Commands cơ bản",
        setDescription: "Các lệnh SQL quan trọng cho quản trị cơ sở dữ liệu",
        courseCode: "DB-301",
        visibility: "public",
        tags: ["sql", "database", "postgresql"],
        items: [
          { front: "SELECT", back: "Truy vấn dữ liệu từ bảng.\nCú pháp: SELECT column1, column2 FROM table WHERE condition;", hint: "Đọc dữ liệu" },
          { front: "INSERT INTO", back: "Thêm bản ghi mới vào bảng.\nCú pháp: INSERT INTO table (col1, col2) VALUES (val1, val2);", hint: "Thêm dữ liệu" },
          { front: "UPDATE", back: "Cập nhật dữ liệu đã có.\nCú pháp: UPDATE table SET col1 = val1 WHERE condition;", hint: "Sửa dữ liệu" },
          { front: "DELETE", back: "Xóa bản ghi khỏi bảng.\nCú pháp: DELETE FROM table WHERE condition;", hint: "Xóa dữ liệu" },
          { front: "JOIN", back: "Kết hợp dữ liệu từ 2+ bảng dựa trên cột liên quan.\nCác loại: INNER, LEFT, RIGHT, FULL OUTER JOIN.", hint: "Nối bảng" },
          { front: "GROUP BY", back: "Nhóm các bản ghi có cùng giá trị, thường dùng với hàm tổng hợp (COUNT, SUM, AVG).", hint: "Nhóm dữ liệu" },
          { front: "INDEX", back: "Cấu trúc dữ liệu giúp tăng tốc truy vấn. Trade-off: nhanh hơn khi đọc, chậm hơn khi ghi.", hint: "Tối ưu truy vấn" },
          { front: "TRANSACTION", back: "Nhóm các thao tác SQL thành một đơn vị. Đảm bảo tính ACID: Atomicity, Consistency, Isolation, Durability.", hint: "Đơn vị thao tác" },
        ],
      },
      {
        setTitle: "JavaScript Concepts",
        setDescription: "Các khái niệm JavaScript quan trọng cho backend developer",
        courseCode: "NODE-401",
        visibility: "public",
        tags: ["javascript", "nodejs", "backend"],
        items: [
          { front: "Callback", back: "Hàm được truyền như tham số vào hàm khác, được gọi lại khi tác vụ hoàn thành.", hint: "Hàm gọi lại" },
          { front: "Promise", back: "Object đại diện cho kết quả của một tác vụ bất đồng bộ. Có 3 trạng thái: pending, fulfilled, rejected.", hint: "Lời hứa bất đồng bộ" },
          { front: "async/await", back: "Cú pháp giúp viết code bất đồng bộ giống đồng bộ. async khai báo hàm, await chờ Promise resolve.", hint: "Cú pháp hiện đại cho Promise" },
          { front: "Event Loop", back: "Cơ chế cho phép Node.js xử lý non-blocking I/O bằng cách đưa callback vào queue và thực thi tuần tự.", hint: "Vòng lặp sự kiện" },
          { front: "Middleware", back: "Hàm có quyền truy cập req, res, next. Xử lý logic trung gian giữa request và response.", hint: "Hàm trung gian trong Express" },
          { front: "Closure", back: "Hàm có thể truy cập biến từ scope bên ngoài, ngay cả khi scope đó đã kết thúc.", hint: "Hàm nhớ scope" },
          { front: "Destructuring", back: "Cú pháp rút trích giá trị từ array/object vào biến riêng.\nVD: const { name, age } = user;", hint: "Tách giá trị" },
          { front: "Spread Operator (...)", back: "Trải các phần tử của array/object. Dùng để copy, merge, hoặc truyền arguments.", hint: "Ba dấu chấm" },
        ],
      },
      {
        setTitle: "React Hooks Cheat Sheet",
        setDescription: "Tổng hợp các React Hooks phổ biến và cách sử dụng",
        courseCode: "REACT-501",
        visibility: "public",
        tags: ["react", "hooks", "frontend"],
        items: [
          { front: "useState", back: "Quản lý state trong functional component.\nconst [state, setState] = useState(initialValue);", hint: "State cơ bản" },
          { front: "useEffect", back: "Xử lý side effects (API calls, subscriptions, DOM manipulation).\nuseEffect(() => { ... }, [deps]);", hint: "Side effects" },
          { front: "useContext", back: "Truy cập giá trị từ React Context mà không cần prop drilling.\nconst value = useContext(MyContext);", hint: "Chia sẻ state global" },
          { front: "useReducer", back: "Quản lý state phức tạp với reducer pattern.\nconst [state, dispatch] = useReducer(reducer, initialState);", hint: "State phức tạp" },
          { front: "useMemo", back: "Memoize giá trị tính toán tốn kém, chỉ tính lại khi dependencies thay đổi.\nconst value = useMemo(() => compute(), [deps]);", hint: "Cache giá trị" },
          { front: "useCallback", back: "Memoize callback function, tránh tạo hàm mới mỗi lần render.\nconst fn = useCallback(() => { ... }, [deps]);", hint: "Cache function" },
          { front: "useRef", back: "Tạo mutable ref object tồn tại qua các lần render. Dùng để truy cập DOM hoặc lưu giá trị không gây re-render.", hint: "Tham chiếu" },
          { front: "Custom Hook", back: "Hàm bắt đầu bằng 'use', tái sử dụng logic stateful giữa các component.\nVD: useAuth(), useFetch(), useLocalStorage()", hint: "Hook tự tạo" },
        ],
      },
      {
        setTitle: "Git Commands Cheat Sheet",
        setDescription: "Các lệnh Git thường dùng hàng ngày",
        courseCode: "GIT-102",
        visibility: "public",
        tags: ["git", "version-control", "devops"],
        items: [
          { front: "git init", back: "Khởi tạo repository Git mới trong thư mục hiện tại.", hint: "Bắt đầu" },
          { front: "git clone <url>", back: "Sao chép toàn bộ repository từ remote về máy local.", hint: "Tải về" },
          { front: "git add .", back: "Đưa tất cả thay đổi vào staging area, chuẩn bị cho commit.", hint: "Stage changes" },
          { front: "git commit -m ''", back: "Lưu snapshot các thay đổi đã stage với message mô tả.", hint: "Lưu thay đổi" },
          { front: "git push", back: "Đẩy commits từ local lên remote repository.", hint: "Upload" },
          { front: "git pull", back: "Kéo và merge thay đổi mới nhất từ remote về local (= fetch + merge).", hint: "Download & merge" },
          { front: "git branch <name>", back: "Tạo nhánh mới. Dùng -d để xóa, không tham số để liệt kê.", hint: "Quản lý nhánh" },
          { front: "git merge <branch>", back: "Gộp thay đổi từ nhánh khác vào nhánh hiện tại.", hint: "Gộp nhánh" },
          { front: "git stash", back: "Tạm lưu thay đổi chưa commit. Dùng git stash pop để khôi phục.", hint: "Cất tạm" },
          { front: "git log --oneline", back: "Xem lịch sử commit dạng ngắn gọn (1 dòng mỗi commit).", hint: "Lịch sử" },
        ],
      },
    ];

    for (const setData of flashcardSets) {
      const existingSet = await prisma.cnt_flashcards.findFirst({
        where: { set_title: setData.setTitle, creator_id: createdBy },
      });

      if (existingSet) {
        console.log(`Flashcard set "${setData.setTitle}" already exists, skipping...`);
        results.skipped++;
        results.details.push({ title: setData.setTitle, status: "skipped" });
        continue;
      }

      const course = await prisma.mst_courses.findUnique({
        where: { course_code: setData.courseCode },
      });

      const flashcardSet = await prisma.cnt_flashcards.create({
        data: {
          set_title: setData.setTitle,
          set_description: setData.setDescription,
          creator_id: createdBy,
          course_id: course?.course_id || null,
          visibility: setData.visibility,
          tags: setData.tags,
          total_cards: setData.items.length,
          status: "published",
          created_by: createdBy,
        },
      });

      for (let i = 0; i < setData.items.length; i++) {
        const item = setData.items[i];
        await prisma.cnt_flashcard_items.create({
          data: {
            flashcard_set_id: flashcardSet.flashcard_set_id,
            front_text: item.front,
            back_text: item.back,
            hint_text: item.hint || null,
            card_order: i + 1,
            created_by: createdBy,
          },
        });
      }

      console.log(`Created flashcard set: "${setData.setTitle}" (${setData.items.length} cards)`);
      results.created++;
      results.details.push({ title: setData.setTitle, status: "created", cards: setData.items.length });
    }

    console.log(`\nFlashcard migration completed! Created: ${results.created}, Skipped: ${results.skipped}`);
    return results;
  },

  async seedPackages() {
    const adminUser = await prisma.mst_users.findFirst({
      orderBy: { created_at_utc: "asc" },
    });
    if (!adminUser) {
      throw new Error("No user found. Please create at least one user first.");
    }

    const createdBy = adminUser.user_id;
    const results = { created: 0, skipped: 0, details: [] };

    const packages = [
      {
        packageCode: "PKG-WEB-FULLSTACK",
        packageName: "Gói Web Fullstack Developer",
        packageDescription: "Trọn bộ khóa học từ Frontend đến Backend, giúp bạn trở thành Fullstack Developer chuyên nghiệp.",
        isFree: false,
        priceAmount: 1499000,
        originalPrice: 2499000,
        discountPercent: 40,
        isFeatured: true,
        courseCodes: ["WEB-201", "NODE-401", "REACT-501", "DB-301"],
      },
      {
        packageCode: "PKG-BEGINNER",
        packageName: "Gói Nhập môn IT",
        packageDescription: "Bộ khóa học dành cho người mới bắt đầu học lập trình, bao gồm các kiến thức nền tảng.",
        isFree: false,
        priceAmount: 799000,
        originalPrice: 1299000,
        discountPercent: 38,
        isFeatured: true,
        courseCodes: ["CS-101", "GIT-102", "WEB-201"],
      },
      {
        packageCode: "PKG-BACKEND-PRO",
        packageName: "Gói Backend Developer Pro",
        packageDescription: "Nâng cao kỹ năng backend với Node.js, TypeScript, Database và DevOps.",
        isFree: false,
        priceAmount: 1899000,
        originalPrice: 2899000,
        discountPercent: 34,
        isFeatured: false,
        courseCodes: ["NODE-401", "TS-402", "DB-301", "DEVOPS-701"],
      },
      {
        packageCode: "PKG-FREE-STARTER",
        packageName: "Gói Miễn phí cho người mới",
        packageDescription: "Tổng hợp các khóa học miễn phí để bạn trải nghiệm nền tảng học tập.",
        isFree: true,
        priceAmount: 0,
        isFeatured: false,
        courseCodes: ["CS-101", "GIT-102"],
      },
      {
        packageCode: "PKG-AI-DATA",
        packageName: "Gói AI & Data Science",
        packageDescription: "Lộ trình từ lập trình cơ bản đến AI và Machine Learning, bao gồm cả nền tảng dữ liệu.",
        isFree: false,
        priceAmount: 1999000,
        originalPrice: 3199000,
        discountPercent: 37,
        isFeatured: true,
        courseCodes: ["CS-101", "DB-301", "AI-801"],
      },
    ];

    for (const pkgData of packages) {
      const existing = await prisma.mst_packages.findUnique({
        where: { package_code: pkgData.packageCode },
      });

      if (existing) {
        console.log(`Package ${pkgData.packageCode} already exists, skipping...`);
        results.skipped++;
        results.details.push({ code: pkgData.packageCode, status: "skipped" });
        continue;
      }

      const pkg = await prisma.mst_packages.create({
        data: {
          package_code: pkgData.packageCode,
          package_name: pkgData.packageName,
          package_description: pkgData.packageDescription,
          is_free: pkgData.isFree ?? false,
          price_amount: pkgData.priceAmount ?? 0,
          original_price: pkgData.originalPrice ?? null,
          currency_code: "VND",
          discount_percent: pkgData.discountPercent ?? 0,
          is_featured: pkgData.isFeatured ?? false,
          status: "published",
          published_at_utc: new Date(),
          created_by: createdBy,
        },
      });

      let addedCourses = 0;
      for (let i = 0; i < pkgData.courseCodes.length; i++) {
        const course = await prisma.mst_courses.findUnique({
          where: { course_code: pkgData.courseCodes[i] },
        });

        if (course) {
          await prisma.mst_package_courses.create({
            data: {
              package_id: pkg.package_id,
              course_id: course.course_id,
              display_order: i + 1,
              created_by: createdBy,
            },
          });
          addedCourses++;
        }
      }

      await prisma.mst_packages.update({
        where: { package_id: pkg.package_id },
        data: { total_courses: addedCourses },
      });

      console.log(`Created package: ${pkgData.packageCode} (${addedCourses} courses)`);
      results.created++;
      results.details.push({ code: pkgData.packageCode, status: "created", courses: addedCourses });
    }

    console.log(`\nPackage migration completed! Created: ${results.created}, Skipped: ${results.skipped}`);
    return results;
  },

  async seedSettings() {
    const adminUser = await prisma.mst_users.findFirst({
      orderBy: { created_at_utc: "asc" },
    });
    if (!adminUser) {
      throw new Error("No user found. Please create at least one user first.");
    }

    const createdBy = adminUser.user_id;
    const results = { created: 0, skipped: 0, details: [] };

    const settings = [
      { key: "site.name", value: "SKR Education", type: "string", group: "general", label: "Tên trang web", description: "Tên hiển thị chính của trang web", isPublic: true, order: 1 },
      { key: "site.description", value: "Nền tảng học tập trực tuyến hàng đầu Việt Nam", type: "string", group: "general", label: "Mô tả trang web", description: "Mô tả ngắn gọn hiển thị trên SEO và footer", isPublic: true, order: 2 },
      { key: "site.logo_url", value: "/images/logo.png", type: "string", group: "general", label: "URL Logo", description: "Đường dẫn đến logo chính của trang web", isPublic: true, order: 3 },
      { key: "site.favicon_url", value: "/favicon.ico", type: "string", group: "general", label: "URL Favicon", description: "Đường dẫn đến favicon", isPublic: true, order: 4 },
      { key: "site.maintenance_mode", value: "false", type: "boolean", group: "general", label: "Chế độ bảo trì", description: "Bật/tắt chế độ bảo trì trang web", isPublic: false, order: 5 },

      { key: "contact.email", value: "support@skr-education.vn", type: "string", group: "contact", label: "Email liên hệ", description: "Email hỗ trợ chính", isPublic: true, order: 1 },
      { key: "contact.phone", value: "1900-xxxx", type: "string", group: "contact", label: "Số điện thoại", description: "Hotline hỗ trợ", isPublic: true, order: 2 },
      { key: "contact.address", value: "Tầng 8, Tòa nhà ABC, Cầu Giấy, Hà Nội", type: "string", group: "contact", label: "Địa chỉ", description: "Địa chỉ văn phòng", isPublic: true, order: 3 },
      { key: "contact.facebook_url", value: "https://facebook.com/skr-education", type: "string", group: "contact", label: "Facebook", description: "Link fanpage Facebook", isPublic: true, order: 4 },
      { key: "contact.zalo_url", value: "https://zalo.me/skr-education", type: "string", group: "contact", label: "Zalo", description: "Link Zalo OA", isPublic: true, order: 5 },

      { key: "upload.max_file_size_mb", value: "50", type: "number", group: "upload", label: "Dung lượng file tối đa (MB)", description: "Giới hạn dung lượng upload cho mỗi file", isPublic: false, order: 1 },
      { key: "upload.allowed_image_types", value: '["image/jpeg","image/png","image/webp","image/gif"]', type: "json", group: "upload", label: "Loại ảnh cho phép", description: "Danh sách MIME types cho phép upload ảnh", isPublic: false, order: 2 },
      { key: "upload.allowed_document_types", value: '["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]', type: "json", group: "upload", label: "Loại tài liệu cho phép", description: "Danh sách MIME types cho phép upload tài liệu", isPublic: false, order: 3 },

      { key: "payment.currency", value: "VND", type: "string", group: "payment", label: "Đơn vị tiền tệ", description: "Đơn vị tiền tệ mặc định", isPublic: true, order: 1 },
      { key: "payment.bank_name", value: "Vietcombank", type: "string", group: "payment", label: "Tên ngân hàng", description: "Ngân hàng nhận thanh toán", isPublic: true, order: 2 },
      { key: "payment.bank_account_number", value: "1234567890", type: "string", group: "payment", label: "Số tài khoản", description: "Số tài khoản ngân hàng", isPublic: true, order: 3 },
      { key: "payment.bank_account_name", value: "CONG TY SKR EDUCATION", type: "string", group: "payment", label: "Tên tài khoản", description: "Tên chủ tài khoản ngân hàng", isPublic: true, order: 4 },
      { key: "payment.free_trial_days", value: "7", type: "number", group: "payment", label: "Số ngày dùng thử", description: "Số ngày dùng thử miễn phí cho người dùng mới", isPublic: true, order: 5 },

      { key: "ai.enabled", value: "true", type: "boolean", group: "ai", label: "Bật tính năng AI", description: "Bật/tắt các tính năng AI trên toàn hệ thống", isPublic: false, order: 1 },
      { key: "ai.max_requests_per_day", value: "20", type: "number", group: "ai", label: "Giới hạn AI requests/ngày", description: "Số lượng yêu cầu AI tối đa mỗi ngày cho mỗi user", isPublic: false, order: 2 },
      { key: "ai.default_model", value: "gpt-4o-mini", type: "string", group: "ai", label: "Model AI mặc định", description: "Model AI sử dụng mặc định cho các tính năng", isPublic: false, order: 3 },
    ];

    for (const s of settings) {
      const existing = await prisma.adm_settings.findUnique({
        where: { setting_key: s.key },
      });

      if (existing) {
        console.log(`Setting "${s.key}" already exists, skipping...`);
        results.skipped++;
        results.details.push({ key: s.key, status: "skipped" });
        continue;
      }

      await prisma.adm_settings.create({
        data: {
          setting_key: s.key,
          setting_value: s.value,
          setting_type: s.type,
          setting_group: s.group,
          setting_label: s.label,
          setting_description: s.description,
          is_public: s.isPublic,
          display_order: s.order,
          created_by: createdBy,
        },
      });

      console.log(`Created setting: ${s.key}`);
      results.created++;
      results.details.push({ key: s.key, status: "created" });
    }

    console.log(`\nSettings migration completed! Created: ${results.created}, Skipped: ${results.skipped}`);
    return results;
  },
};

module.exports = migrationService;

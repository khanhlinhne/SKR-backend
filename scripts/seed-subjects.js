const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed subjects data...");

  // Xóa tất cả subjects cũ để seed lại từ đầu
  console.log("🗑️  Deleting existing subjects...");
  await prisma.mst_lessons.deleteMany({});
  await prisma.mst_chapters.deleteMany({});
  await prisma.mst_subjects.deleteMany({});
  console.log("✅ Deleted all existing subjects, chapters, and lessons");

  // Tìm hoặc tạo một user creator
  let creator = await prisma.mst_users.findFirst({
    where: {
      mst_user_roles: {
        some: {
          mst_roles: {
            role_code: "creator",
          },
        },
      },
    },
  });

  // Nếu không có creator, lấy bất kỳ user nào
  if (!creator) {
    creator = await prisma.mst_users.findFirst();
  }

  // Nếu vẫn không có user, báo lỗi
  if (!creator) {
    console.error("❌ No users found in database. Please create a user first.");
    process.exit(1);
  }

  console.log(`✅ Using creator: ${creator.user_id} (${creator.email})`);

  // Dữ liệu subjects mẫu với hình ảnh Unsplash
  const subjectsData = [
    {
      subject_code: "TOAN12",
      subject_name: "Toán Học Lớp 12",
      subject_description:
        "Khóa học Toán Học lớp 12 bao gồm đầy đủ kiến thức cơ bản và nâng cao. Học sinh sẽ được học về giải tích, hàm số, hình học không gian và các chuyên đề ôn thi THPTQG. Đây là môn học quan trọng nhất trong kỳ thi tốt nghiệp THPT.",
      subject_icon_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop",
      display_order: 1,
      is_free: false,
      price_amount: 299000,
      original_price: 499000,
      discount_percent: 40,
      currency_code: "VND",
      total_chapters: 7,
      total_lessons: 42,
      total_videos: 38,
      total_documents: 20,
      total_questions: 500,
      estimated_duration_hours: 60,
      purchase_count: 4520,
      rating_average: 4.8,
      rating_count: 1250,
      is_featured: true,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "VAN12",
      subject_name: "Ngữ Văn Lớp 12",
      subject_description:
        "Khóa học Ngữ Văn lớp 12 với đầy đủ các tác phẩm văn học, văn bản và tiếng Việt. Ôn thi THPTQG hiệu quả với phương pháp học tập khoa học. Bao gồm tất cả các tác phẩm trong chương trình thi THPT.",
      subject_icon_url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=400&fit=crop",
      display_order: 2,
      is_free: true,
      price_amount: 0,
      original_price: 0,
      discount_percent: 0,
      currency_code: "VND",
      total_chapters: 6,
      total_lessons: 36,
      total_videos: 32,
      total_documents: 15,
      total_questions: 400,
      estimated_duration_hours: 50,
      purchase_count: 8900,
      rating_average: 4.7,
      rating_count: 980,
      is_featured: true,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "ANH12",
      subject_name: "Tiếng Anh Lớp 12",
      subject_description:
        "Khóa học Tiếng Anh lớp 12 chuẩn bị cho kỳ thi THPTQG. Bao gồm ngữ pháp, từ vựng, đọc hiểu và luyện đề thi các năm. Phương pháp học tập hiệu quả giúp đạt điểm cao trong kỳ thi.",
      subject_icon_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&h=400&fit=crop",
      display_order: 3,
      is_free: false,
      price_amount: 199000,
      original_price: 399000,
      discount_percent: 50,
      currency_code: "VND",
      total_chapters: 8,
      total_lessons: 48,
      total_videos: 45,
      total_documents: 25,
      total_questions: 600,
      estimated_duration_hours: 55,
      purchase_count: 6200,
      rating_average: 4.9,
      rating_count: 2100,
      is_featured: true,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "LY12",
      subject_name: "Vật Lý Lớp 12",
      subject_description:
        "Khóa học Vật Lý lớp 12 với đầy đủ các chương: Dao động cơ, Sóng cơ, Điện xoay chiều, Dao động và sóng điện từ, Sóng ánh sáng, Lượng tử ánh sáng, Vật lý hạt nhân. Có video thí nghiệm mô phỏng.",
      subject_icon_url: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&h=400&fit=crop",
      display_order: 4,
      is_free: false,
      price_amount: 249000,
      original_price: 449000,
      discount_percent: 45,
      currency_code: "VND",
      total_chapters: 7,
      total_lessons: 44,
      total_videos: 40,
      total_documents: 18,
      total_questions: 450,
      estimated_duration_hours: 52,
      purchase_count: 3200,
      rating_average: 4.6,
      rating_count: 870,
      is_featured: false,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "HOA12",
      subject_name: "Hóa Học Lớp 12",
      subject_description:
        "Khóa học Hóa Học lớp 12: Este - Lipit, Cacbonhidrat, Amin - Aminoaxit - Protein, Polime, Đại cương kim loại, Kim loại kiềm - kiềm thổ - nhôm, Crom - Sắt - Đồng. Công thức và phương trình hóa học đầy đủ.",
      subject_icon_url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=400&fit=crop",
      display_order: 5,
      is_free: false,
      price_amount: 279000,
      original_price: 479000,
      discount_percent: 42,
      currency_code: "VND",
      total_chapters: 7,
      total_lessons: 42,
      total_videos: 38,
      total_documents: 20,
      total_questions: 480,
      estimated_duration_hours: 48,
      purchase_count: 2800,
      rating_average: 4.7,
      rating_count: 720,
      is_featured: false,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "SINH12",
      subject_name: "Sinh Học Lớp 12",
      subject_description:
        "Khóa học Sinh Học lớp 12 với các chủ đề: Di truyền học, Tiến hóa, Sinh thái học. Ôn thi THPTQG toàn diện với sơ đồ tư duy và phương pháp ghi nhớ hiệu quả.",
      subject_icon_url: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&h=400&fit=crop",
      display_order: 6,
      is_free: true,
      price_amount: 0,
      original_price: 0,
      discount_percent: 0,
      currency_code: "VND",
      total_chapters: 4,
      total_lessons: 24,
      total_videos: 22,
      total_documents: 12,
      total_questions: 300,
      estimated_duration_hours: 35,
      purchase_count: 6700,
      rating_average: 4.5,
      rating_count: 560,
      is_featured: false,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "SU12",
      subject_name: "Lịch Sử Lớp 12",
      subject_description:
        "Khóa học Lịch Sử lớp 12: Việt Nam từ 1919-1930, từ 1930-1945, từ 1945-1954, từ 1954-1975, từ 1975 đến nay. Lịch sử thế giới. Phương pháp học lịch sử bằng sơ đồ thời gian.",
      subject_icon_url: "https://images.unsplash.com/photo-1461360370896-922624d12a74?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1461360370896-922624d12a74?w=800&h=400&fit=crop",
      display_order: 7,
      is_free: true,
      price_amount: 0,
      original_price: 0,
      discount_percent: 0,
      currency_code: "VND",
      total_chapters: 5,
      total_lessons: 30,
      total_videos: 28,
      total_documents: 15,
      total_questions: 350,
      estimated_duration_hours: 40,
      purchase_count: 4500,
      rating_average: 4.4,
      rating_count: 420,
      is_featured: false,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "DIALY12",
      subject_name: "Địa Lý Lớp 12",
      subject_description:
        "Khóa học Địa Lý lớp 12: Địa lý tự nhiên Việt Nam, Địa lý dân cư, Địa lý các ngành kinh tế, Vùng kinh tế, Bảo vệ môi trường. Có bản đồ và số liệu cập nhật mới nhất.",
      subject_icon_url: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=400&fit=crop",
      display_order: 8,
      is_free: true,
      price_amount: 0,
      original_price: 0,
      discount_percent: 0,
      currency_code: "VND",
      total_chapters: 4,
      total_lessons: 26,
      total_videos: 24,
      total_documents: 14,
      total_questions: 320,
      estimated_duration_hours: 38,
      purchase_count: 3900,
      rating_average: 4.5,
      rating_count: 380,
      is_featured: false,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "GDCD12",
      subject_name: "Giáo Dục Công Dân Lớp 12",
      subject_description:
        "Khóa học GDCD lớp 12: Công dân với các quyền tự do dân chủ, quyền bình đẳng, quyền nghĩa vụ, pháp luật trong đời sống. Giúp học sinh dễ dàng đạt điểm 9-10 trong kỳ thi.",
      subject_icon_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=400&fit=crop",
      display_order: 9,
      is_free: true,
      price_amount: 0,
      original_price: 0,
      discount_percent: 0,
      currency_code: "VND",
      total_chapters: 3,
      total_lessons: 18,
      total_videos: 16,
      total_documents: 10,
      total_questions: 200,
      estimated_duration_hours: 20,
      purchase_count: 5100,
      rating_average: 4.3,
      rating_count: 290,
      is_featured: false,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "TOAN11",
      subject_name: "Toán Học Lớp 11",
      subject_description:
        "Khóa học Toán Học lớp 11: Đại số (hàm số lượng giác, phương trình lượng giác, tổ hợp - xác suất), Giải tích (giới hạn, đạo hàm), Hình học (quan hệ song song, quan hệ vuông góc).",
      subject_icon_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop",
      display_order: 10,
      is_free: false,
      price_amount: 249000,
      original_price: 399000,
      discount_percent: 38,
      currency_code: "VND",
      total_chapters: 6,
      total_lessons: 38,
      total_videos: 35,
      total_documents: 18,
      total_questions: 420,
      estimated_duration_hours: 48,
      purchase_count: 2100,
      rating_average: 4.7,
      rating_count: 650,
      is_featured: false,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "PYTHON",
      subject_name: "Lập Trình Python Cơ Bản",
      subject_description:
        "Khóa học Python từ cơ bản đến nâng cao. Học cách viết code, làm việc với dữ liệu, lập trình hướng đối tượng và xây dựng ứng dụng thực tế. Phù hợp cho người mới bắt đầu.",
      subject_icon_url: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=400&fit=crop",
      display_order: 11,
      is_free: false,
      price_amount: 399000,
      original_price: 699000,
      discount_percent: 43,
      currency_code: "VND",
      total_chapters: 10,
      total_lessons: 60,
      total_videos: 55,
      total_documents: 25,
      total_questions: 400,
      estimated_duration_hours: 45,
      purchase_count: 7800,
      rating_average: 4.9,
      rating_count: 1560,
      is_featured: true,
      status: "published",
      published_at_utc: new Date(),
    },
    {
      subject_code: "IELTS",
      subject_name: "IELTS Academic - Lộ Trình 7.0+",
      subject_description:
        "Khóa học IELTS chuyên sâu với lộ trình rõ ràng đạt 7.0+. Bao gồm 4 kỹ năng: Reading, Writing, Speaking, Listening. Có đề thi thực hành và giải chi tiết từng phần.",
      subject_icon_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=100&h=100&fit=crop",
      subject_banner_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop",
      display_order: 12,
      is_free: false,
      price_amount: 599000,
      original_price: 899000,
      discount_percent: 33,
      currency_code: "VND",
      total_chapters: 16,
      total_lessons: 80,
      total_videos: 75,
      total_documents: 35,
      total_questions: 800,
      estimated_duration_hours: 65,
      purchase_count: 5400,
      rating_average: 4.8,
      rating_count: 980,
      is_featured: true,
      status: "published",
      published_at_utc: new Date(),
    },
  ];

  // Tạo subjects
  for (const subjectData of subjectsData) {
    const subject = await prisma.mst_subjects.create({
      data: {
        ...subjectData,
        creator_id: creator.user_id,
        created_by: creator.user_id,
      },
    });

    console.log(`✅ Created subject: ${subject.subject_name}`);

    // Tạo chapters cho mỗi subject
    const chapterNames = {
      "TOAN12": ["Ứng dụng đạo hàm", "Hàm số lũy thừa", "Mũ và Logarit", "Nguyên hàm - Tích phân", "Số phức", "Khối đa diện", "Mặt nón - Mặt trụ - Mặt cầu"],
      "VAN12": ["Việt Bắc", "Tây Tiến", "Đàn Guitar của Tố Hữu", "Tin Thể Thao", "Phong Cách Ngôn Ngữ Báo Chí", "Vợ Chồng A Phủ"],
      "ANH12": ["Unit 1: Home Life", "Unit 2: Cultural Diversity", "Unit 3: Ways of Socialising", "Unit 4: School Education System", "Unit 5: Higher Education", "Unit 6: Future Jobs", "Unit 7: Artificial Intelligence", "Unit 8: Global Warming"],
      "LY12": ["Dao động cơ", "Sóng cơ", "Điện xoay chiều", "Dao động và sóng điện từ", "Sóng ánh sáng", "Lượng tử ánh sáng", "Hạt nhân nguyên tử"],
      "HOA12": ["Este - Lipit", "Cacbonhidrat", "Amin - Aminoaxit - Protein", "Polime", "Đại cương kim loại", "Kim loại kiềm - kiềm thổ - nhôm", "Crom - Sắt - Đồng"],
      "SINH12": ["Gen - Bệnh di truyền", " ADN - ARN - Protein", "Điều hòa gen", "Đột biến gen", "Tiến hóa", "Sinh thái học"],
      "SU12": ["Việt Nam 1919-1930", "Việt Nam 1930-1945", "Việt Nam 1945-1954", "Việt Nam 1954-1975", "Việt Nam 1975-nay"],
      "DIALY12": ["Địa lý tự nhiên", "Địa lý dân cư", "Địa lý kinh tế", "Vùng kinh tế"],
      "GDCD12": ["Công dân với quyền tự do", "Công dân với pháp luật", "Công dân với kinh tế", "Công dân với văn hóa"],
      "TOAN11": ["Hàm số lượng giác", "Phương trình lượng giác", "Tổ hợp - Xác suất", "Giới hạn", "Đạo hàm", "Quan hệ song song"],
      "PYTHON": ["Python cơ bản", "Biến và kiểu dữ liệu", "Cấu trúc điều kiện", "Vòng lặp", "Hàm", "List - Tuple - Dictionary", "File I/O", "Lập trình hướng đối tượng", "Xử lý lỗi", "Project thực tế"],
      "IELTS": ["Reading Fundamentals", "True/False/Not Given", "Matching Headings", "Multiple Choice", "Writing Task 1", "Writing Task 2", "Speaking Part 1", "Speaking Part 2&3", "Listening Overview", "Map & Plan Diagrams"]
    };

    const chapterCount = subjectData.total_chapters;
    const chaptersData = [];

    for (let i = 1; i <= chapterCount; i++) {
      const chapterName = chapterNames[subjectData.subject_code]?.[i - 1] || `Chương ${i}: Nội dung chính`;
      chaptersData.push({
        chapter_code: `${subjectData.subject_code}-CH${i.toString().padStart(2, '0')}`,
        chapter_name: chapterName,
        chapter_number: i,
        display_order: i,
        estimated_duration_minutes: 90,
      });
    }

    for (const chapterData of chaptersData) {
      const chapter = await prisma.mst_chapters.create({
        data: {
          ...chapterData,
          subject_id: subject.subject_id,
          created_by: creator.user_id,
        },
      });

      console.log(`   📚 Created chapter: ${chapter.chapter_name}`);

      // Tạo lessons cho mỗi chapter (tùy theo số lessons)
      const lessonsPerChapter = Math.ceil(subjectData.total_lessons / chapterCount);
      const lessonNames = [
        "Giới thiệu chương",
        "Lý thuyết trọng tâm",
        "Ví dụ minh họa",
        "Bài tập cơ bản",
        "Bài tập nâng cao",
        "Ôn tập chương"
      ];

      for (let i = 1; i <= Math.min(lessonsPerChapter, 6); i++) {
        const lessonName = lessonNames[i - 1] || `Bài ${i}`;
        await prisma.mst_lessons.create({
          data: {
            chapter_id: chapter.chapter_id,
            lesson_code: `${chapter.chapter_code}-L${i.toString().padStart(2, '0')}`,
            lesson_name: lessonName,
            lesson_number: i,
            display_order: i,
            created_by: creator.user_id,
            estimated_duration_minutes: 30,
          },
        });
      }

      console.log(`      📖 Created ${Math.min(lessonsPerChapter, 6)} lessons`);
    }
  }

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

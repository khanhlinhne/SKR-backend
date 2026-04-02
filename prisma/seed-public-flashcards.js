const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PUBLIC_FLASHcard_SETS = [
  {
    setTitle: 'Tiếng Anh - Từ vựng TOEIC 500',
    setDescription: 'Bộ thẻ từ vựng TOEIC phổ biến nhất, giúp bạn đạt 500+ điểm TOEIC.',
    tags: ['Tiếng Anh', 'TOEIC', 'Từ vựng'],
    totalCards: 20,
    visibility: 'public',
    status: 'active',
  },
  {
    setTitle: 'Toán học - Đạo hàm và Tích phân',
    setDescription: 'Ôn tập đạo hàm và tích phân cơ bản cho học sinh THPT.',
    tags: ['Toán', 'Đạo hàm', 'Tích phân'],
    totalCards: 15,
    visibility: 'public',
    status: 'active',
  },
  {
    setTitle: 'Sinh học - Di truyền học',
    setDescription: 'Tổng hợp kiến thức di truyền học lớp 12.',
    tags: ['Sinh học', 'Di truyền', 'Lớp 12'],
    totalCards: 18,
    visibility: 'public',
    status: 'active',
  },
  {
    setTitle: 'Hóa học - Bảng tuần hoàn nguyên tố',
    setDescription: 'Ghi nhớ nhanh các nguyên tố hóa học trong bảng tuần hoàn.',
    tags: ['Hóa học', 'Bảng tuần hoàn', 'Nguyên tố'],
    totalCards: 25,
    visibility: 'public',
    status: 'active',
  },
  {
    setTitle: 'Vật lý - Sóng cơ học',
    setDescription: 'Ôn tập kiến thức về sóng cơ học và các đặc trưng sóng.',
    tags: ['Vật lý', 'Sóng', 'Cơ học'],
    totalCards: 12,
    visibility: 'public',
    status: 'active',
  },
  {
    setTitle: 'Lịch sử - Việt Nam qua các thời kỳ',
    setDescription: 'Tổng hợp các sự kiện lịch sử quan trọng của Việt Nam.',
    tags: ['Lịch sử', 'Việt Nam', 'Ôn thi'],
    totalCards: 20,
    visibility: 'public',
    status: 'active',
  },
  {
    setTitle: 'Địa lý - Các quốc gia trên thế giới',
    setDescription: 'Tìm hiểu về vị trí, thủ đô và đặc điểm các quốc gia.',
    tags: ['Địa lý', 'Quốc gia', 'Thế giới'],
    totalCards: 15,
    visibility: 'public',
    status: 'active',
  },
  {
    setTitle: 'Tin học - Thuật toán cơ bản',
    setDescription: 'Các thuật toán sắp xếp và tìm kiếm cơ bản.',
    tags: ['Tin học', 'Thuật toán', 'Lập trình'],
    totalCards: 10,
    visibility: 'public',
    status: 'active',
  },
];

const FLASHCARD_ITEMS = {
  'Tiếng Anh - Từ vựng TOEIC 500': [
    { front: 'Accomplish', back: 'Hoàn thành, đạt được' },
    { front: 'Achieve', back: 'Đạt được, giành được' },
    { front: 'Adequate', back: 'Đủ, thích hợp' },
    { front: 'Adjust', back: 'Điều chỉnh, thích nghi' },
    { front: 'Administer', back: 'Quản lý, điều hành' },
    { front: 'Advocate', back: 'ủng hộ, đề xuất' },
    { front: 'Allocate', back: 'Phân bổ, phân phối' },
    { front: 'Anticipate', back: 'Dự đoán, trông đợi' },
    { front: 'Appoint', back: 'Bổ nhiệm, chỉ định' },
    { front: 'Approve', back: 'Phê duyệt, tán thành' },
    { front: 'Assess', back: 'Đánh giá, ước lượng' },
    { front: 'Assign', back: 'Giao việc, phân công' },
    { front: 'Assist', back: 'Hỗ trợ, giúp đỡ' },
    { front: 'Assume', back: 'Giả định, cho rằng' },
    { front: 'Attain', back: 'Đạt được, đạt tới' },
    { front: 'Authorize', back: 'Ủy quyền, cho phép' },
    { front: 'Benefit', back: 'Lợi ích, lợi thế' },
    { front: 'Boost', back: 'Tăng cường, đẩy mạnh' },
    { front: 'Brief', back: 'Tóm tắt, ngắn gọn' },
    { front: 'Clarify', back: 'Làm rõ, giải thích' },
  ],
  'Toán học - Đạo hàm và Tích phân': [
    { front: 'Đạo hàm của x^n là gì?', back: 'n*x^(n-1)' },
    { front: 'Đạo hàm của sin(x) là gì?', back: 'cos(x)' },
    { front: 'Đạo hàm của cos(x) là gì?', back: '-sin(x)' },
    { front: 'Đạo hàm của e^x là gì?', back: 'e^x' },
    { front: 'Đạo hàm của ln(x) là gì?', back: '1/x' },
    { front: 'Đạo hàm của tích f*g?', back: 'f*g + f*g' },
    { front: 'Đạo hàm của thương f/g?', back: '(f*g - f*g)/g^2' },
    { front: 'Tích phân của x^n?', back: 'x^(n+1)/(n+1) + C' },
    { front: 'Tích phân của 1/x?', back: 'ln|x| + C' },
    { front: 'Tích phân của e^x?', back: 'e^x + C' },
    { front: 'Tích phân của sin(x)?', back: '-cos(x) + C' },
    { front: 'Tích phân của cos(x)?', back: 'sin(x) + C' },
    { front: 'Quy tắc chuỗi (chain rule)?', back: 'd/dx[f(g(x))] = f(g(x))*g(x)' },
    { front: 'Đạo hàm cấp 2 là gì?', back: 'Đạo hàm của đạo hàm' },
    { front: 'Điểm cực trị khi đạo hàm bằng 0 và đổi dấu?', back: 'Đúng - cực đại hoặc cực tiểu' },
  ],
  'Sinh học - Di truyền học': [
    { front: 'Gen là gì?', back: 'Đơn vị cơ bản của di truyền' },
    { front: 'Nhiễm sắc thể (chromosome) là gì?', back: 'Cấu trúc mang gen trong tế bào' },
    { front: 'DNA là viết tắt của?', back: 'Deoxyribonucleic Acid - Axit Deoxyribonucleic' },
    { front: 'RNA là viết tắt của?', back: 'Ribonucleic Acid - Axit Ribonucleic' },
    { front: 'Gen trội là gì?', back: 'Gen biểu hiện tính trạng khi có mặt' },
    { front: 'Gen lặn là gì?', back: 'Chỉ biểu hiện khi đồng hợp tử' },
    { front: 'Đột biến gen là gì?', back: 'Thay đổi trong trình tự DNA' },
    { front: 'Lai ghép là gì?', back: 'Kết hợp vật liệu di truyền từ 2 cá thể' },
    { front: 'Thường biến là gì?', back: 'Biến đổi kiểu hình do môi trường' },
    { front: 'Hội chứng Down là gì?', back: 'Tam bội thể nhiễm sắc thể 21' },
    { front: 'Di truyền liên kết gen là gì?', back: 'Các gen trên cùng NST di truyền cùng nhau' },
    { front: 'Đột biến nhiễm sắc thể là gì?', back: 'Thay đổi cấu trúc hoặc số lượng NST' },
    { front: 'Plasmid là gì?', back: 'Vòng DNA nhỏ trong vi khuẩn' },
    { front: 'Bản đồ di truyền là gì?', back: 'Sơ đồ vị trí các gen trên NST' },
    { front: 'Gen đa hiệu là gì?', back: 'Một gen ảnh hưởng nhiều tính trạng' },
    { front: 'Tính đa hiệu của gen là gì?', back: 'Một gen ảnh hưởng nhiều tính trạng' },
    { front: 'Gen lặn liên kết giới tính?', back: 'Gen trên NST X, không có trên Y' },
    { front: 'Ứng dụng của công nghệ gen?', back: 'Tạo sinh vật biến đổi gen, chữa bệnh' },
  ],
  'Hóa học - Bảng tuần hoàn nguyên tố': [
    { front: 'Nguyên tố số 1?', back: 'Hydrogen (H)' },
    { front: 'Nguyên tố số 2?', back: 'Helium (He)' },
    { front: 'Nguyên tố số 6?', back: 'Carbon (C)' },
    { front: 'Nguyên tố số 7?', back: 'Nitrogen (N)' },
    { front: 'Nguyên tố số 8?', back: 'Oxygen (O)' },
    { front: 'Nguyên tố số 11?', back: 'Sodium (Na)' },
    { front: 'Nguyên tố số 12?', back: 'Magnesium (Mg)' },
    { front: 'Nguyên tố số 13?', back: 'Aluminum (Al)' },
    { front: 'Nguyên tố số 14?', back: 'Silicon (Si)' },
    { front: 'Nguyên tố số 15?', back: 'Phosphorus (P)' },
    { front: 'Nguyên tố số 16?', back: 'Sulfur (S)' },
    { front: 'Nguyên tố số 17?', back: 'Chlorine (Cl)' },
    { front: 'Nguyên tố số 19?', back: 'Potassium (K)' },
    { front: 'Nguyên tố số 20?', back: 'Calcium (Ca)' },
    { front: 'Kim loại kiềm thổ gồm?', back: 'Be, Mg, Ca, Sr, Ba, Ra' },
    { front: 'Halogen gồm?', back: 'F, Cl, Br, I, At' },
    { front: 'Khí hiếm gồm?', back: 'He, Ne, Ar, Kr, Xe, Rn' },
    { front: 'Chu kỳ 1 có mấy nguyên tố?', back: '2 (H, He)' },
    { front: 'Nhóm IA gồm?', back: 'Li, Na, K, Rb, Cs, Fr' },
    { front: 'Nguyên tố kim loại mạnh nhất?', back: 'Francium (Fr) - tính kim loại mạnh nhất' },
    { front: 'Nguyên tố phi kim mạnh nhất?', back: 'Fluorine (F)' },
    { front: 'Nguyên tố có khối lượng nguyên tử lớn nhất?', back: 'Oganesson (Og)' },
    { front: 'Đồng (Cu) có số hiệu bao nhiêu?', back: '29' },
    { front: 'Sắt (Fe) có số hiệu bao nhiêu?', back: '26' },
    { front: 'Vàng (Au) có số hiệu bao nhiêu?', back: '79' },
  ],
  'Vật lý - Sóng cơ học': [
    { front: 'Sóng cơ học là gì?', back: 'Dao động lan truyền trong môi trường vật chất' },
    { front: 'Sóng ngang là gì?', back: 'Phương dao động vuông góc phương truyền' },
    { front: 'Sóng dọc là gì?', back: 'Phương dao động trùng phương truyền' },
    { front: 'Bước sóng là gì?', back: 'Khoảng cách giữa 2 điểm dao động cùng pha' },
    { front: 'Tần số sóng là gì?', back: 'Số dao động trong 1 giây' },
    { front: 'Chu kỳ sóng là gì?', back: 'Thời gian để 1 dao động hoàn thành' },
    { front: 'Biên độ sóng là gì?', back: 'Độ lệch cực đại khỏi vị trí cân bằng' },
    { front: 'Tốc độ sóng = ?', back: 'v = λ*f = λ/T' },
    { front: 'Năng lượng sóng tỉ lệ với?', back: 'Bình phương biên độ' },
    { front: 'Sóng âm là sóng?', back: 'Cơ học, có thể là ngang hoặc dọc' },
    { front: 'Tần số âm nghe được?', back: '16Hz - 20kHz' },
    { front: 'Hiện tượng giao thoa sóng?', back: '2 sóng kết hợp tạo vân giao thoa' },
  ],
  'Lịch sử - Việt Nam qua các thời kỳ': [
    { front: 'Hồng Bàng thuộc thời kỳ nào?', back: 'Thời tiền sử - thế kỷ III TCN' },
    { front: 'An Dương Vương lập nước nào?', back: 'Âu Lạc (257 TCN)' },
    { front: 'Nước Nam Việt do ai lập?', back: 'Triệu Đà (207 TCN)' },
    { front: 'Khởi nghĩa Hai Bà Trưng năm nào?', back: 'Năm 40 SCN' },
    { front: 'Khởi nghĩa Bà Triệu năm nào?', back: 'Năm 248 SCN' },
    { front: 'Ngô Quyền đánh bại ai ở sông Bạch Đằng?', back: 'Nam Hán (938 SCN)' },
    { front: 'Nhà Lý đóng đô ở đâu?', back: 'Thăng Long (Hà Nội)' },
    { front: 'Nhà Trần thành lập năm nào?', back: 'Năm 1226' },
    { front: 'Chiến thắng Bạch Đằng năm nào?', back: 'Năm 1288 - Trần Hưng Đạo' },
    { front: 'Cuộc khởi nghĩa Lam Sơn do ai lãnh đạo?', back: 'Lê Lợi (1418)' },
    { front: 'Nhà Hồ thành lập năm nào?', back: 'Năm 1400' },
    { front: 'Chúa Trịnh, Chúa Nguyễn từ thế kỷ nào?', back: 'Thế kỷ XVI - XVIII' },
    { front: 'Tây Sơn khởi nghĩa năm nào?', back: 'Năm 1771' },
    { front: 'Nguyễn Ánh thành lập nhà nào?', back: 'Nhà Nguyễn (1802)' },
    { front: 'Hai chiến thắng Điện Biên Phủ năm nào?', back: '1954' },
    { front: 'Ngày thống nhất đất nước?', back: '30/4/1975' },
    { front: 'Nước CHXHCNVN thành lập năm nào?', back: '1976' },
    { front: 'Đổi mới bắt đầu năm nào?', back: '1986' },
    { front: 'Thành phố Hồ Chí Minh đổi tên năm nào?', back: '1976 (từ Sài Gòn)' },
    { front: 'Kinh tế Việt Nam tăng trưởng nhanh nhất khi nào?', back: 'Giai đoạn 1990-2010' },
  ],
  'Địa lý - Các quốc gia trên thế giới': [
    { front: 'Thủ đô của Nhật Bản?', back: 'Tokyo' },
    { front: 'Thủ đô của Hàn Quốc?', back: 'Seoul' },
    { front: 'Thủ đô của Trung Quốc?', back: 'Bắc Kinh' },
    { front: 'Thủ đô của Mỹ?', back: 'Washington D.C' },
    { front: 'Thủ đô của Anh?', back: 'London' },
    { front: 'Thủ đô của Pháp?', back: 'Paris' },
    { front: 'Thủ đô của Đức?', back: 'Berlin' },
    { front: 'Thủ đô của Nga?', back: 'Moscow' },
    { front: 'Thủ đô của Australia?', back: 'Canberra' },
    { front: 'Quốc gia rộng nhất thế giới?', back: 'Nga' },
    { front: 'Quốc gia đông dân nhất thế giới?', back: 'Trung Quốc' },
    { front: 'Đại dương lớn nhất?', back: 'Thái Bình Dương' },
    { front: 'Châu lục rộng nhất?', back: 'Châu Á' },
    { front: 'Dãy núi dài nhất thế giới?', back: 'Dãy Andes' },
    { front: 'Đỉnh núi cao nhất thế giới?', back: 'Everest (8848m)' },
  ],
  'Tin học - Thuật toán cơ bản': [
    { front: 'Thuật toán sắp xếp nổi bọt (Bubble Sort)?', back: 'So sánh cặp kề, đổi chỗ nếu sai thứ tự' },
    { front: 'Độ phức tạp Bubble Sort?', back: 'O(n²)' },
    { front: 'Thuật toán sắp xếp chọn (Selection Sort)?', back: 'Chọn phần tử nhỏ nhất, đưa về đầu' },
    { front: 'Độ phức tạp Selection Sort?', back: 'O(n²)' },
    { front: 'Thuật toán sắp xếp chèn (Insertion Sort)?', back: 'Chèn từng phần tử vào vị trí đúng' },
    { front: 'Thuật toán tìm kiếm nhị phân?', back: 'Chia đôi mảng, so sánh với phần tử giữa' },
    { front: 'Độ phức tạp tìm kiếm nhị phân?', back: 'O(log n)' },
    { front: 'Độ phức tạp tìm kiếm tuyến tính?', back: 'O(n)' },
    { front: 'QuickSort hoạt động bằng cách?', back: 'Chọn pivot, phân hoạch, đệ quy' },
    { front: 'MergeSort hoạt động bằng cách?', back: 'Chia mảng, sắp xếp, trộn' },
  ],
};

async function main() {
  console.log('🌱 Starting seed for public flashcards...');

  // Find or create a system user for demo creator
  let systemUser = await prisma.mst_users.findFirst({
    where: {
      OR: [
        { email: 'system@skr.edu.vn' },
        { username: 'system' },
      ],
    },
  });

  if (!systemUser) {
    // Create a demo user for the flashcard creator
    systemUser = await prisma.mst_users.create({
      data: {
        user_id: '00000000-0000-0000-0000-000000000001',
        username: 'skr_demo',
        email: 'demo@skr.edu.vn',
        full_name: 'SKR Demo Creator',
        display_name: 'SKR Team',
        password_hash: 'demo_account_no_login',
        status: 'active',
        created_by: 'system_seed',
      },
    });
    console.log('✅ Created demo user');
  }

  // Create public flashcard sets with items
  for (const setData of PUBLIC_FLASHcard_SETS) {
    // Check if set already exists
    const existingSet = await prisma.cnt_flashcards.findFirst({
      where: { set_title: setData.setTitle },
    });

    if (existingSet) {
      console.log(`⚠️  Set "${setData.setTitle}" already exists, skipping...`);
      continue;
    }

    const flashcardSet = await prisma.cnt_flashcards.create({
      data: {
        set_title: setData.setTitle,
        set_description: setData.setDescription,
        tags: setData.tags,
        total_cards: setData.totalCards,
        visibility: 'public',
        status: 'active',
        creator_id: systemUser.user_id,
        created_by: systemUser.user_id,
      },
    });

    console.log(`✅ Created flashcard set: ${setData.setTitle}`);

    // Create flashcard items
    const items = FLASHCARD_ITEMS[setData.setTitle] || [];
    for (let i = 0; i < items.length; i++) {
      await prisma.cnt_flashcard_items.create({
        data: {
          flashcard_set_id: flashcardSet.flashcard_set_id,
          front_text: items[i].front,
          back_text: items[i].back,
          card_order: i + 1,
          created_by: systemUser.user_id,
          status: 'active',
        },
      });
    }

    console.log(`   📚 Added ${items.length} cards`);
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

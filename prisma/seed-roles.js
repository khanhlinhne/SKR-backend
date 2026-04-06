/**
 * Seed script: Tạo các role mặc định trong mst_roles.
 * Chạy: node prisma/seed-roles.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const roles = [
  {
    role_code: "admin",
    role_name: "Quản trị viên",
    role_description: "Toàn quyền quản lý hệ thống",
    role_level: 100,
    is_active: true,
  },
  {
    role_code: "creator",
    role_name: "Chuyên gia",
    role_description: "Người tạo và quản lý khóa học",
    role_level: 50,
    is_active: true,
  },
  {
    role_code: "user",
    role_name: "Người học",
    role_description: "Người dùng thông thường",
    role_level: 10,
    is_active: true,
  },
  {
    role_code: "staff",
    role_name: "Nhân viên",
    role_description: "Nhân viên hỗ trợ",
    role_level: 30,
    is_active: true,
  },
];

async function main() {
  console.log("Bat dau seed roles...");

  for (const role of roles) {
    const existing = await prisma.mst_roles.findUnique({
      where: { role_code: role.role_code },
    });

    if (existing) {
      console.log(`  Role "${role.role_code}" da ton tai, bo qua.`);
    } else {
      // Use a placeholder UUID for created_by (will be replaced by actual admin)
      await prisma.mst_roles.create({
        data: {
          ...role,
          created_by: "00000000-0000-0000-0000-000000000001",
        },
      });
      console.log(`  Da tao role "${role.role_code}" - ${role.role_name}`);
    }
  }

  console.log("Seed roles hoan tat!");
}

main()
  .catch((e) => {
    console.error("Loi khi seed roles:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

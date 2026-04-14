require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.mst_users.findUnique({ where: { email: 'admin@gmail.com' }});
  if (!user) {
    console.log("NOT_FOUND");
  } else {
    console.log("is_active:", user.is_active);
    console.log("email_verified:", user.email_verified);
    console.log("password_hash:", !!user.password_hash);
  }
  process.exit(0);
}
run();

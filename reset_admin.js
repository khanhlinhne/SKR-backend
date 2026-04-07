require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPass() {
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.mst_users.update({
    where: { email: 'admin@gmail.com' },
    data: { password_hash: hash }
  });
  console.log("SUCCESS");
  process.exit(0);
}
resetPass();

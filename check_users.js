require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  // List all users
  const users = await p.mst_users.findMany({
    where: { is_active: true },
    select: { user_id: true, email: true, full_name: true, display_name: true, created_at_utc: true },
    orderBy: { created_at_utc: 'asc' },
  });
  console.log('=== ALL ACTIVE USERS ===');
  users.forEach(u => console.log(` - ${u.email} | ${u.full_name || u.display_name || 'N/A'} | ${u.user_id}`));

  // List practice tests per user
  const practices = await p.lrn_practice_tests.findMany({
    where: { status: 'active' },
    select: { user_id: true, test_title: true },
  });
  console.log('\n=== PRACTICE TESTS ===');
  practices.forEach(pt => console.log(` - user:${pt.user_id} | ${pt.test_title}`));

  await p.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });

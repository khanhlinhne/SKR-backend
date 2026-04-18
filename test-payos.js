const prisma = require('./src/config/prisma');
const orderService = require('./src/services/order.service');

async function test() {
    try {
        const user = await prisma.mst_users.findFirst({ where: { full_name: { contains: 'Anh' } } });
        const courseId = 'bf584e1c-5be4-4858-8250-57dd882ecb01';
        
        if (!user) {
            console.log("User not found");
            return;
        }

        console.log(`Testing with User: ${user.user_id}, Course: ${courseId}`);
        
        const result = await orderService.createOrder(user.user_id, { courseId });
        console.log("SUCCESS:", result);
    } catch (error) {
        console.error("FAILED TO CREATE ORDER:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

test();

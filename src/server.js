const config = require("./config");
const app = require("./app");
const prisma = require("./config/prisma");

async function start() {
  try {
    await prisma.$connect();
    console.log("[DB] Connected to PostgreSQL");

    app.listen(config.port, () => {
      console.log(`[SERVER] Running on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (error) {
    console.error("[SERVER] Failed to start:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();

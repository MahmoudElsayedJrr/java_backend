const http = require("http");
const app = require("./app");
const logger = require("./config/logger");
const prisma = require("./config/prisma");
const { initSocket } = require("./sockets"); // uncomment when sockets module is built

const PORT = parseInt(process.env.PORT || 3000);

const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────
initSocket(server); // uncomment when sockets module is built

// ── Start ────────────────────────────────────────────────────
const start = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info("✅ Database connected");

    server.listen(PORT, () => {
      logger.info(
        `Java Cafe POS API running on port ${PORT} [${process.env.NODE_ENV}]`,
      );
    });
  } catch (err) {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed. DB disconnected.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  process.exit(1);
});

start();

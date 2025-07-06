import { PrismaClient } from "../generated/client/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    transactionOptions: {
      maxWait: 15000, // 15 seconds
      timeout: 10000, // 10 seconds
    },
  });

// Add connection error handling - don't block startup
setTimeout(() => {
  prisma
    .$connect()
    .then(() => {
      console.log("✅ Prisma connected to database");
    })
    .catch((error) => {
      console.error("❌ Prisma connection failed:", error);
      console.log("⚠️  Server will continue without database connection");
      // Don't throw - let the app continue without database if needed
    });
}, 1000); // Delay connection attempt by 1 second

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

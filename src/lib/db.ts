// Database Utilities - Prisma Client Singleton
// Ensures single Prisma instance across hot reloads in development

import { PrismaClient } from "@prisma/client";

// Declare global type for Prisma client caching
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Check if we're in build time
function isBuildTime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE === "phase-production-build"
  );
}

// Create Prisma client with logging configuration
const prismaClientSingleton = () => {
  // During build time, create a mock client to prevent database connections
  if (isBuildTime()) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          "Database operations are not available during build time"
        );
      },
    });
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

// Use global cache in development to prevent multiple instances
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// Connection helper - ensures database is connected
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("✓ Database connected");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    throw error;
  }
}

// Disconnect helper - gracefully closes database connection
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log("✓ Database disconnected");
  } catch (error) {
    console.error("✗ Database disconnection failed:", error);
    throw error;
  }
}

// Health check - verifies database connectivity
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Export Prisma types for convenience
export * from "@prisma/client";
export type { Prisma } from "@prisma/client";

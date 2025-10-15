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

  // Create modified DATABASE_URL with SSL configuration
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let modifiedDatabaseUrl = originalDatabaseUrl;

  if (originalDatabaseUrl) {
    const url = new URL(originalDatabaseUrl);

    console.log("[DB] Initializing Prisma client...");
    console.log("[DB] Original DATABASE_URL hostname:", url.hostname);

    // Respect sslmode from DATABASE_URL query string
    // Valid values: disable, allow, prefer, require, verify-ca, verify-full
    if (!url.searchParams.has("sslmode")) {
      // Default to "prefer" if not specified (tries SSL, falls back to non-SSL)
      // This works for Railway, Neon, Vercel, and self-hosted setups
      url.searchParams.set("sslmode", "prefer");
      console.log("[DB] No sslmode specified, defaulting to 'prefer'");
    } else {
      const sslMode = url.searchParams.get("sslmode");
      console.log(`[DB] Using sslmode from DATABASE_URL: ${sslMode}`);
    }

    // Add channel_binding if env variable is set AND not using pooler
    // Neon's pooler (transaction/session pooler) does NOT support channel_binding
    const shouldAddChannelBinding = process.env.NEON_ADD_CHANNEL_BINDING === "true";
    const isPoolerConnection = url.hostname.includes("pooler");

    console.log("[DB] NEON_ADD_CHANNEL_BINDING env:", process.env.NEON_ADD_CHANNEL_BINDING);
    console.log("[DB] Is pooler connection:", isPoolerConnection);
    console.log("[DB] Should add channel_binding:", shouldAddChannelBinding);

    if (shouldAddChannelBinding && !url.searchParams.has("channel_binding") && !isPoolerConnection) {
      url.searchParams.set("channel_binding", "require");
      console.log("[DB] ✓ Added channel_binding=require (direct connection)");
    } else if (isPoolerConnection) {
      console.log("[DB] ✓ Skipping channel_binding for pooler connection");
    }

    // Add pgbouncer parameter to disable prepared statements if using pooler
    // This prevents "Statement 's0' already exists" errors
    if (isPoolerConnection && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
      console.log("[DB] ✓ Added pgbouncer=true (disables prepared statements)");
    }

    modifiedDatabaseUrl = url.toString();
    console.log("[DB] Final connection params:", url.searchParams.toString());
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: modifiedDatabaseUrl,
      },
    },
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

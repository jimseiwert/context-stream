// Database Client - Drizzle ORM with PostgreSQL
// Singleton pattern for connection pooling

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

// Declare global type for database client caching
declare global {
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  // eslint-disable-next-line no-var
  var queryClient: ReturnType<typeof postgres> | undefined;
}

// Check if we're in build time
function isBuildTime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE === "phase-production-build"
  );
}

// Create database connection
function createDatabaseClient() {
  // During build time, create a mock client to prevent database connections
  if (isBuildTime()) {
    return new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
      get() {
        throw new Error(
          "Database operations are not available during build time"
        );
      },
    });
  }

  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("[DB] Initializing Drizzle client...");

  // Parse and modify DATABASE_URL
  const url = new URL(databaseUrl);
  console.log("[DB] Database hostname:", url.hostname);

  // Respect sslmode from DATABASE_URL query string
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "prefer");
    console.log("[DB] No sslmode specified, defaulting to 'prefer'");
  } else {
    const sslMode = url.searchParams.get("sslmode");
    console.log(`[DB] Using sslmode from DATABASE_URL: ${sslMode}`);
  }

  // Handle Neon channel_binding
  const shouldAddChannelBinding =
    process.env.NEON_ADD_CHANNEL_BINDING === "true";
  const isPoolerConnection = url.hostname.includes("pooler");

  console.log(
    "[DB] NEON_ADD_CHANNEL_BINDING env:",
    process.env.NEON_ADD_CHANNEL_BINDING
  );
  console.log("[DB] Is pooler connection:", isPoolerConnection);

  if (
    shouldAddChannelBinding &&
    !url.searchParams.has("channel_binding") &&
    !isPoolerConnection
  ) {
    url.searchParams.set("channel_binding", "require");
    console.log("[DB] ✓ Added channel_binding=require (direct connection)");
  } else if (isPoolerConnection) {
    console.log("[DB] ✓ Skipping channel_binding for pooler connection");
  }

  // Configure postgres.js connection
  const connectionString = url.toString();

  // Create postgres.js client
  const queryClient = postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // Disable prepared statements for poolers (pgbouncer)
    prepare: !isPoolerConnection,
    onnotice: () => {}, // Suppress notices in production
  });

  console.log("[DB] Connection pool configured");

  // Create Drizzle instance
  const db = drizzle(queryClient, {
    schema,
    logger: process.env.NODE_ENV === "development",
  });

  // Store query client globally for cleanup
  if (process.env.NODE_ENV !== "production") {
    globalThis.queryClient = queryClient;
  }

  return db;
}

// Use global cache in development to prevent multiple instances
export const db = globalThis.db ?? createDatabaseClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.db = db;
}

// Compatibility shim: named "prisma" so callers don't need to be updated all at once
import { eq, and, or, count as drizzleCount } from "drizzle-orm";
import { users, sources, workspaces, pages, apiKeys, sessions, subscriptions, jobs, auditLogs, queryLogs } from "./db/schema";

export const prisma = {
  user: {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return await db.query.users.findFirst({ where: eq(users.id, where.id) });
      }
      if (where.email) {
        return await db.query.users.findFirst({ where: eq(users.email, where.email) });
      }
      return null;
    },
    findMany: async (params?: any) => {
      return await db.query.users.findMany(params);
    },
    count: async (params?: any) => {
      const result = await db.select({ count: drizzleCount() }).from(users);
      return result[0]?.count || 0;
    },
    create: async ({ data }: { data: any }) => {
      const [user] = await db.insert(users).values(data).returning();
      return user;
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const [user] = await db.update(users).set(data).where(eq(users.id, where.id)).returning();
      return user;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const [user] = await db.delete(users).where(eq(users.id, where.id)).returning();
      return user;
    },
  },
  source: {
    findUnique: async ({ where, include }: { where: { id?: string; url?: string }; include?: any }) => {
      const conditions = [];
      if (where.id) conditions.push(eq(sources.id, where.id));
      if (where.url) conditions.push(eq(sources.url, where.url));

      return await db.query.sources.findFirst({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: include,
      });
    },
    findMany: async ({ where, include, orderBy, take, skip }: any = {}) => {
      return await db.query.sources.findMany({
        where,
        with: include,
        orderBy,
        limit: take,
        offset: skip,
      });
    },
    count: async (params?: any) => {
      const result = await db.select({ count: drizzleCount() }).from(sources);
      return result[0]?.count || 0;
    },
    create: async ({ data }: { data: any }) => {
      const [source] = await db.insert(sources).values(data).returning();
      return source;
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const [source] = await db.update(sources).set(data).where(eq(sources.id, where.id)).returning();
      return source;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const [source] = await db.delete(sources).where(eq(sources.id, where.id)).returning();
      return source;
    },
  },
  workspace: {
    findUnique: async ({ where, include }: { where: { id?: string; slug?: string }; include?: any }) => {
      const conditions = [];
      if (where.id) conditions.push(eq(workspaces.id, where.id));
      if (where.slug) conditions.push(eq(workspaces.slug, where.slug));

      return await db.query.workspaces.findFirst({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: include,
      });
    },
    findMany: async (params?: any) => {
      return await db.query.workspaces.findMany(params);
    },
    count: async (params?: any) => {
      const result = await db.select({ count: drizzleCount() }).from(workspaces);
      return result[0]?.count || 0;
    },
    create: async ({ data }: { data: any }) => {
      const [workspace] = await db.insert(workspaces).values(data).returning();
      return workspace;
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const [workspace] = await db.update(workspaces).set(data).where(eq(workspaces.id, where.id)).returning();
      return workspace;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const [workspace] = await db.delete(workspaces).where(eq(workspaces.id, where.id)).returning();
      return workspace;
    },
  },
  page: {
    count: async (params?: any) => {
      const result = await db.select({ count: drizzleCount() }).from(pages);
      return result[0]?.count || 0;
    },
  },
  apiKey: {
    findUnique: async ({ where }: { where: { id?: string; key?: string } }) => {
      if (where.id) {
        return await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, where.id) });
      }
      if (where.key) {
        return await db.query.apiKeys.findFirst({ where: eq(apiKeys.key, where.key) });
      }
      return null;
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const [apiKey] = await db.update(apiKeys).set(data).where(eq(apiKeys.id, where.id)).returning();
      return apiKey;
    },
  },
  session: {
    findUnique: async ({ where }: { where: { token: string } }) => {
      return await db.query.sessions.findFirst({ where: eq(sessions.token, where.token) });
    },
  },
  subscription: {
    findUnique: async ({ where }: { where: { userId: string } }) => {
      return await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, where.userId) });
    },
    create: async ({ data }: { data: any }) => {
      const [subscription] = await db.insert(subscriptions).values(data).returning();
      return subscription;
    },
    update: async ({ where, data }: { where: { userId: string }; data: any }) => {
      const [subscription] = await db.update(subscriptions).set(data).where(eq(subscriptions.userId, where.userId)).returning();
      return subscription;
    },
  },
  job: {
    count: async ({ where }: any = {}) => {
      const result = await db.select({ count: drizzleCount() }).from(jobs).where(where);
      return result[0]?.count || 0;
    },
    findMany: async ({ where, orderBy, take }: any = {}) => {
      return await db.query.jobs.findMany({
        where,
        orderBy,
        limit: take,
      });
    },
  },
  auditLog: {
    create: async ({ data }: { data: any }) => {
      const [log] = await db.insert(auditLogs).values(data).returning();
      return log;
    },
  },
  queryLog: {
    create: async ({ data }: { data: any }) => {
      const [log] = await db.insert(queryLogs).values(data).returning();
      return log;
    },
    count: async (params?: any) => {
      const result = await db.select({ count: drizzleCount() }).from(queryLogs);
      return result[0]?.count || 0;
    },
  },
} as any;

// Connection helper - ensures database is connected
export async function connectDatabase() {
  try {
    // Test connection with a simple query
    await db.execute(sql`SELECT 1`);
    console.log("✓ Database connected");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    throw error;
  }
}

// Disconnect helper - gracefully closes database connection
export async function disconnectDatabase() {
  try {
    if (globalThis.queryClient) {
      await globalThis.queryClient.end();
      console.log("✓ Database disconnected");
    }
  } catch (error) {
    console.error("✗ Database disconnection failed:", error);
    throw error;
  }
}

// Health check - verifies database connectivity
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Export all schema for convenience
export * from "./db/schema";

// Re-export sql for convenience
export { sql };

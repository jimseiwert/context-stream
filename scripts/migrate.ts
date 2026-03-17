/**
 * Production database migration script.
 * Uses drizzle-orm's programmatic migrator — no drizzle-kit required at runtime.
 * Bundled by esbuild into scripts/migrate.js (CJS format) during Docker build.
 *
 * Env vars:
 *   DATABASE_URL_DIRECT  Preferred: direct (non-pooled) connection for advisory locks
 *   DATABASE_URL         Fallback: standard connection URL
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

if (!url) {
  console.error("❌ Neither DATABASE_URL_DIRECT nor DATABASE_URL is set");
  process.exit(1);
}

const maskedUrl = url.replace(/:\/\/([^@]*)@/, "://***@");
console.log("📦 Running database migrations...");
console.log(`   Connection: ${maskedUrl}`);

// __dirname is injected by esbuild CJS bundling.
// At runtime: __dirname = /app/scripts, so migrationsFolder = /app/drizzle
const migrationsFolder = path.resolve(__dirname, "../drizzle");

void (async () => {
  const client = postgres(url as string, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder });
    console.log("   ✓ Migrations applied successfully");
  } catch (err) {
    console.error("   ✗ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();

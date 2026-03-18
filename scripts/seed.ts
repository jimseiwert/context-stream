// Seed script for local development
// Creates a default admin user, workspace, and sample sources
// Usage: npm run db:seed

import { db } from "../src/lib/db";
import {
  users,
  workspaces,
  workspaceMembers,
  sources,
  workspaceSources,
  vectorStoreConfigs,
} from "../src/lib/db/schema";
import { encryptApiKey } from "../src/lib/utils/encryption";

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Create admin user
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Admin User",
      email: "admin@localhost",
      emailVerified: true,
      role: "SUPER_ADMIN",
    })
    .onConflictDoNothing()
    .returning();

  if (!adminUser) {
    console.log("  ℹ Admin user already exists, skipping");
  } else {
    console.log(`  ✓ Created admin user: ${adminUser.email}`);
  }

  // Re-fetch admin user in case it already existed
  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, "admin@localhost"),
  });
  if (!existingAdmin) throw new Error("Could not find admin user");

  // 2. Create default workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: "Default Workspace",
      slug: "default",
      ownerId: existingAdmin.id,
    })
    .onConflictDoNothing()
    .returning();

  if (!workspace) {
    console.log("  ℹ Default workspace already exists, skipping");
  } else {
    console.log(`  ✓ Created workspace: ${workspace.name}`);

    // Add admin as workspace member
    await db
      .insert(workspaceMembers)
      .values({
        workspaceId: workspace.id,
        userId: existingAdmin.id,
        role: "SUPER_ADMIN",
        joinedAt: new Date(),
      })
      .onConflictDoNothing();
    console.log("  ✓ Added admin as workspace member");
  }

  const existingWorkspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.slug, "default"),
  });
  if (!existingWorkspace) throw new Error("Could not find default workspace");

  // 3. Create a sample global source
  const [sampleSource] = await db
    .insert(sources)
    .values({
      url: "https://nextjs.org/docs",
      domain: "nextjs.org",
      name: "Next.js Documentation",
      type: "WEBSITE",
      scope: "GLOBAL",
      status: "PENDING",
      rescrapeSchedule: "WEEKLY",
      createdById: existingAdmin.id,
    })
    .onConflictDoNothing()
    .returning();

  if (!sampleSource) {
    console.log("  ℹ Sample source already exists, skipping");
  } else {
    console.log(`  ✓ Created sample source: ${sampleSource.name}`);

    // Link source to workspace
    await db
      .insert(workspaceSources)
      .values({
        workspaceId: existingWorkspace.id,
        sourceId: sampleSource.id,
        addedBy: existingAdmin.id,
      })
      .onConflictDoNothing();
  }

  // 4. Create default vector store config (pgvector + OpenAI embeddings)
  const storeConfig = encryptApiKey(
    JSON.stringify({ connectionString: process.env.DATABASE_URL ?? "postgresql://localhost/contextstream" })
  );
  const embeddingConfig = encryptApiKey(
    JSON.stringify({
      apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
      model: "text-embedding-3-small",
      dimensions: 1536,
    })
  );

  const [vsConfig] = await db
    .insert(vectorStoreConfigs)
    .values({
      name: "Default (pgvector + OpenAI)",
      storeProvider: "pgvector",
      storeConfig,
      embeddingProvider: "openai",
      embeddingConfig,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (vsConfig) {
    console.log("  ✓ Created default vector store config (pgvector)");
  }

  console.log("\n✅ Seed complete!");
  console.log("   Admin email:    admin@localhost");
  console.log("   Admin password: set via /register or auth provider");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

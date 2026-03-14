// Sources Page — Server Component
// Fetches sources server-side and renders the SourcesTable client component

import { db } from "@/lib/db";
import { sources, workspaceSources, workspaceMembers } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SourcesTable } from "@/components/sources/sources-table";
import { or, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Fetch sources the user created + all global sources
  const sourceList = await db.query.sources.findMany({
    where: or(eq(sources.scope, "GLOBAL"), eq(sources.createdById, userId)),
    orderBy: [desc(sources.createdAt)],
    columns: {
      id: true,
      url: true,
      name: true,
      type: true,
      status: true,
      pageCount: true,
      lastScrapedAt: true,
      createdAt: true,
    },
  });

  return <SourcesTable sources={sourceList} />;
}

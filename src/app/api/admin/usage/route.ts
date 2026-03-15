// Admin Usage API — GET /api/admin/usage?range=7d&format=json|csv

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  workspaces,
  users,
  pages,
  documents,
  chunks,
  queryLogs,
  workspaceSources,
  sources,
  subscriptions,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/middleware";
import { handleApiError } from "@/lib/utils/errors";
import { eq, gte, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getRangeStart(range: string): Date {
  const now = new Date();
  switch (range) {
    case "90d":
      now.setDate(now.getDate() - 90);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    case "7d":
    default:
      now.setDate(now.getDate() - 7);
      break;
  }
  return now;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "7d";
    const format = searchParams.get("format") ?? "json";
    const rangeStart = getRangeStart(range);

    // Fetch all workspaces with their owners
    const workspaceRows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .orderBy(workspaces.name);

    // Build per-workspace stats
    const stats = await Promise.all(
      workspaceRows.map(async (ws) => {
        // Owner email
        let ownerEmail = "—";
        if (ws.ownerId) {
          const owner = await db.query.users.findFirst({
            where: eq(users.id, ws.ownerId),
            columns: { email: true },
          });
          ownerEmail = owner?.email ?? "—";
        }

        // Count sources linked to workspace
        const [sourceCountResult] = await db
          .select({ count: count() })
          .from(workspaceSources)
          .where(eq(workspaceSources.workspaceId, ws.id));
        const sourceCount = Number(sourceCountResult?.count ?? 0);

        // Count pages via sources
        const linkedSourceRows = await db
          .select({ sourceId: workspaceSources.sourceId })
          .from(workspaceSources)
          .where(eq(workspaceSources.workspaceId, ws.id));

        const sourceIds = linkedSourceRows.map((r) => r.sourceId);

        let pageCount = 0;
        let documentCount = 0;
        let chunkCount = 0;

        if (sourceIds.length > 0) {
          for (const sid of sourceIds) {
            const [pc] = await db
              .select({ count: count() })
              .from(pages)
              .where(eq(pages.sourceId, sid));
            pageCount += Number(pc?.count ?? 0);

            const [dc] = await db
              .select({ count: count() })
              .from(documents)
              .where(eq(documents.sourceId, sid));
            documentCount += Number(dc?.count ?? 0);
          }

          // Chunk count — approximate via pages
          for (const sid of sourceIds) {
            const pageRows = await db
              .select({ id: pages.id })
              .from(pages)
              .where(eq(pages.sourceId, sid));
            for (const pg of pageRows) {
              const [cc] = await db
                .select({ count: count() })
                .from(chunks)
                .where(eq(chunks.pageId, pg.id));
              chunkCount += Number(cc?.count ?? 0);
            }
          }
        }

        // API call count (queryLogs within range)
        const [qLogResult] = await db
          .select({ count: count() })
          .from(queryLogs)
          .where(
            sql`${queryLogs.workspaceId} = ${ws.id} AND ${queryLogs.createdAt} >= ${rangeStart}`
          );
        const apiCallCount = Number(qLogResult?.count ?? 0);

        // Subscription
        let subscriptionTier = "NONE";
        if (ws.ownerId) {
          const sub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.userId, ws.ownerId),
            columns: { planTier: true },
          });
          subscriptionTier = sub?.planTier ?? "NONE";
        }

        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          ownerEmail,
          sourceCount,
          pageCount,
          documentCount,
          chunkCount,
          apiCallCount,
          subscriptionTier,
        };
      })
    );

    if (format === "csv") {
      const header =
        "Workspace,Owner Email,Sources,Pages,Documents,Chunks,API Calls,Plan\r\n";
      const rows = stats
        .map(
          (s) =>
            `"${s.workspaceName}","${s.ownerEmail}",${s.sourceCount},${s.pageCount},${s.documentCount},${s.chunkCount},${s.apiCallCount},${s.subscriptionTier}`
        )
        .join("\r\n");

      return new NextResponse(header + rows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="usage-${range}.csv"`,
        },
      });
    }

    return NextResponse.json({ stats, range });
  } catch (error) {
    return handleApiError(error);
  }
}

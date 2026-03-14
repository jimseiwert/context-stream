// Job SSE Streaming Endpoint
// GET /api/jobs/[id]/stream — Server-Sent Events stream for job progress

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jobs, sources } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const POLL_INTERVAL_MS = 2000;

interface JobEventPayload {
  id: string;
  status: string;
  logs: string | null;
  progress: unknown;
  errorMessage: string | null;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate before opening the stream
  try {
    await requireAuth();
  } catch {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(payload: JobEventPayload) {
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Check for client disconnect
      const abortSignal = request.signal;
      let closed = false;

      abortSignal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      async function poll() {
        while (!closed) {
          try {
            const [row] = await db
              .select({
                id: jobs.id,
                status: jobs.status,
                logs: jobs.logs,
                progress: jobs.progress,
                errorMessage: jobs.errorMessage,
                completedAt: jobs.completedAt,
                startedAt: jobs.startedAt,
                createdAt: jobs.createdAt,
              })
              .from(jobs)
              .where(eq(jobs.id, id));

            if (!row) {
              // Job not found — send error event and close
              const notFoundPayload = {
                id,
                status: "NOT_FOUND",
                logs: null,
                progress: null,
                errorMessage: "Job not found",
                updatedAt: new Date().toISOString(),
              };
              send(notFoundPayload);
              closed = true;
              controller.close();
              return;
            }

            const payload: JobEventPayload = {
              id: row.id,
              status: row.status,
              logs: row.logs ?? null,
              progress: row.progress ?? null,
              errorMessage: row.errorMessage ?? null,
              updatedAt: (row.completedAt ?? row.startedAt ?? row.createdAt).toISOString(),
            };

            send(payload);

            if (TERMINAL_STATUSES.has(row.status)) {
              closed = true;
              controller.close();
              return;
            }
          } catch (err) {
            // On DB error, emit an error event and stop
            console.error("[SSE] Poll error for job", id, err);
            const errPayload: JobEventPayload = {
              id,
              status: "ERROR",
              logs: null,
              progress: null,
              errorMessage: "Stream error occurred",
              updatedAt: new Date().toISOString(),
            };
            try {
              send(errPayload);
              controller.close();
            } catch {
              // stream already closed
            }
            closed = true;
            return;
          }

          if (!closed) {
            await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
        }
      }

      poll().catch(() => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

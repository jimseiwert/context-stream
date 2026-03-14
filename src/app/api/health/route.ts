import { checkDatabaseHealth } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  const dbHealthy = await checkDatabaseHealth();

  return NextResponse.json(
    {
      status: dbHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: { database: { status: dbHealthy ? "healthy" : "unhealthy" } },
      responseTime: `${Date.now() - start}ms`,
      version: process.env.APP_VERSION ?? "1.0.0",
    },
    { status: dbHealthy ? 200 : 503 }
  );
}

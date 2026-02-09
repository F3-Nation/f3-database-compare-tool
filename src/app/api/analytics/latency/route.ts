import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { latencySnapshots } from "@/lib/db/schema";
import { desc, and, gte, eq, type SQL } from "drizzle-orm";

const TIME_RANGES: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function computeStats(values: number[]) {
  if (values.length === 0) return { avg: 0, min: 0, max: 0, p95: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const p95Index = Math.ceil(sorted.length * 0.95) - 1;
  return {
    avg: Math.round(sum / sorted.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p95: sorted[Math.max(0, p95Index)],
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeRange = searchParams.get("timeRange") || "24h";
  const environment = searchParams.get("environment") || undefined;
  const platformId = searchParams.get("platformId") || undefined;

  const rangeMs = TIME_RANGES[timeRange];
  if (!rangeMs) {
    return NextResponse.json(
      { error: `Invalid timeRange: ${timeRange}. Use 1h, 24h, 7d, or 30d` },
      { status: 400 },
    );
  }

  const since = new Date(Date.now() - rangeMs);
  const conditions: SQL[] = [gte(latencySnapshots.createdAt, since)];

  if (environment && environment !== "all") {
    conditions.push(eq(latencySnapshots.environment, environment));
  }
  if (platformId && platformId !== "all") {
    conditions.push(eq(latencySnapshots.platformId, platformId));
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(latencySnapshots)
    .where(and(...conditions))
    .orderBy(desc(latencySnapshots.createdAt))
    .limit(2000);

  const byPlatform = new Map<string, number[]>();
  for (const row of rows) {
    const existing = byPlatform.get(row.platformId) || [];
    existing.push(row.latencyMs);
    byPlatform.set(row.platformId, existing);
  }

  const stats: Record<
    string,
    ReturnType<typeof computeStats> & { count: number }
  > = {};
  for (const [pid, values] of byPlatform) {
    stats[pid] = { ...computeStats(values), count: values.length };
  }

  return NextResponse.json({
    timeRange,
    environment: environment || "all",
    platformId: platformId || "all",
    count: rows.length,
    stats,
    snapshots: rows,
  });
}

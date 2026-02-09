import { NextResponse } from "next/server";
import "@/lib/platforms";
import { getConfiguredPlatforms } from "@/lib/platforms/registry";
import { getDb } from "@/lib/db";
import { latencySnapshots } from "@/lib/db/schema";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const environment = process.env.APP_ENVIRONMENT || "local";
  const platforms = getConfiguredPlatforms();

  const results = await Promise.all(
    platforms.map(async (platform) => {
      const health = await platform.healthCheck();
      return {
        platformId: platform.id,
        ok: health.ok,
        latencyMs: Math.round(health.latencyMs),
        error: health.error ?? null,
        version: health.version ?? null,
      };
    }),
  );

  const db = getDb();
  const values = results.map((r) => ({
    platformId: r.platformId,
    environment,
    latencyMs: r.latencyMs,
    ok: r.ok,
    error: r.error,
    version: r.version,
  }));

  await db.insert(latencySnapshots).values(values);

  return NextResponse.json({
    inserted: results.length,
    environment,
    snapshots: results.map((r) => ({
      platformId: r.platformId,
      ok: r.ok,
      latencyMs: r.latencyMs,
    })),
  });
}

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import "@/lib/platforms";
import { getConfiguredPlatforms } from "@/lib/platforms/registry";
import { getDb } from "@/lib/db";
import { latencySnapshots } from "@/lib/db/schema";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const environment = process.env.APP_ENVIRONMENT || "local";

  if (!cronSecret && environment !== "local") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 401 },
    );
  }

  if (cronSecret) {
    const auth = request.headers.get("authorization") || "";
    const expected = `Bearer ${cronSecret}`;
    const authBuf = Buffer.from(auth);
    const expectedBuf = Buffer.from(expected);
    if (
      authBuf.length !== expectedBuf.length ||
      !timingSafeEqual(authBuf, expectedBuf)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
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
  } catch {
    return NextResponse.json(
      { error: "Failed to collect latency snapshots" },
      { status: 500 },
    );
  }
}

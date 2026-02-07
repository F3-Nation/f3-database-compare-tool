import { NextResponse } from "next/server";
import "@/lib/platforms";
import { getAllPlatforms } from "@/lib/platforms/registry";

export async function GET() {
  const platforms = getAllPlatforms();

  const results = await Promise.all(
    platforms.map(async (p) => {
      const configured = p.isConfigured();
      let health = null;

      if (configured) {
        try {
          health = await p.healthCheck();
        } catch {
          health = { ok: false, latencyMs: 0, error: "Health check failed" };
        }
      }

      return {
        id: p.id,
        name: p.name,
        configured,
        health,
      };
    }),
  );

  return NextResponse.json(results);
}

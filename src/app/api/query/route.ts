import { NextResponse } from "next/server";
import "@/lib/platforms";
import { getPlatform } from "@/lib/platforms/registry";
import { PlatformId } from "@/lib/platforms/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { platformId, sql } = body as { platformId: string; sql: string };

  if (!platformId || !sql) {
    return NextResponse.json(
      { error: "platformId and sql are required" },
      { status: 400 },
    );
  }

  const platform = getPlatform(platformId as PlatformId);
  if (!platform) {
    return NextResponse.json(
      { error: `Unknown platform: ${platformId}` },
      { status: 404 },
    );
  }

  if (!platform.isConfigured()) {
    return NextResponse.json(
      { error: `${platform.name} is not configured` },
      { status: 400 },
    );
  }

  const result = await platform.runQuery(sql);
  return NextResponse.json(result);
}

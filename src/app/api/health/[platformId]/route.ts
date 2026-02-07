import { NextResponse } from "next/server";
import "@/lib/platforms";
import { getPlatform } from "@/lib/platforms/registry";
import { PlatformId } from "@/lib/platforms/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platformId: string }> },
) {
  const { platformId } = await params;
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

  const health = await platform.healthCheck();
  return NextResponse.json(health);
}

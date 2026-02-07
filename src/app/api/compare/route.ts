import { NextResponse } from "next/server";
import "@/lib/platforms";
import { getPlatform } from "@/lib/platforms/registry";
import { PlatformId } from "@/lib/platforms/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { leftId, rightId, sql } = body as {
    leftId: string;
    rightId: string;
    sql: string;
  };

  if (!leftId || !rightId || !sql) {
    return NextResponse.json(
      { error: "leftId, rightId, and sql are required" },
      { status: 400 },
    );
  }

  const left = getPlatform(leftId as PlatformId);
  const right = getPlatform(rightId as PlatformId);

  if (!left) {
    return NextResponse.json(
      { error: `Unknown platform: ${leftId}` },
      { status: 404 },
    );
  }
  if (!right) {
    return NextResponse.json(
      { error: `Unknown platform: ${rightId}` },
      { status: 404 },
    );
  }

  if (!left.isConfigured()) {
    return NextResponse.json(
      { error: `${left.name} is not configured` },
      { status: 400 },
    );
  }
  if (!right.isConfigured()) {
    return NextResponse.json(
      { error: `${right.name} is not configured` },
      { status: 400 },
    );
  }

  const [leftResult, rightResult] = await Promise.all([
    left.runQuery(sql),
    right.runQuery(sql),
  ]);

  return NextResponse.json({
    left: { platformId: leftId, name: left.name, ...leftResult },
    right: { platformId: rightId, name: right.name, ...rightResult },
  });
}

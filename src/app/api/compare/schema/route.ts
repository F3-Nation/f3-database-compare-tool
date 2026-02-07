import { NextResponse } from "next/server";
import "@/lib/platforms";
import { getPlatform } from "@/lib/platforms/registry";
import { PlatformId } from "@/lib/platforms/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { leftId, rightId } = body as { leftId: string; rightId: string };

  if (!leftId || !rightId) {
    return NextResponse.json(
      { error: "leftId and rightId are required" },
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

  const [leftSchema, rightSchema] = await Promise.all([
    left.getSchema(),
    right.getSchema(),
  ]);

  // Build diff
  const leftTableMap = new Map(
    leftSchema.tables.map((t) => [`${t.schema}.${t.name}`, t]),
  );
  const rightTableMap = new Map(
    rightSchema.tables.map((t) => [`${t.schema}.${t.name}`, t]),
  );

  const allTableKeys = new Set([
    ...leftTableMap.keys(),
    ...rightTableMap.keys(),
  ]);

  const diff = Array.from(allTableKeys)
    .sort()
    .map((key) => {
      const leftTable = leftTableMap.get(key);
      const rightTable = rightTableMap.get(key);

      if (!leftTable) {
        return { table: key, status: "right_only" as const, columns: [] };
      }
      if (!rightTable) {
        return { table: key, status: "left_only" as const, columns: [] };
      }

      // Compare columns
      const leftColMap = new Map(leftTable.columns.map((c) => [c.name, c]));
      const rightColMap = new Map(rightTable.columns.map((c) => [c.name, c]));
      const allColNames = new Set([
        ...leftColMap.keys(),
        ...rightColMap.keys(),
      ]);

      const columns = Array.from(allColNames).map((colName) => {
        const lCol = leftColMap.get(colName);
        const rCol = rightColMap.get(colName);

        if (!lCol)
          return {
            name: colName,
            status: "right_only" as const,
            left: null,
            right: rCol!,
          };
        if (!rCol)
          return {
            name: colName,
            status: "left_only" as const,
            left: lCol,
            right: null,
          };

        const match =
          lCol.dataType === rCol.dataType &&
          lCol.isNullable === rCol.isNullable;
        return {
          name: colName,
          status: match ? ("match" as const) : ("diff" as const),
          left: lCol,
          right: rCol,
        };
      });

      const allMatch = columns.every((c) => c.status === "match");
      return {
        table: key,
        status: allMatch ? ("match" as const) : ("diff" as const),
        columns,
      };
    });

  return NextResponse.json({
    left: {
      platformId: leftId,
      name: left.name,
      tableCount: leftSchema.tables.length,
      latencyMs: leftSchema.latencyMs,
    },
    right: {
      platformId: rightId,
      name: right.name,
      tableCount: rightSchema.tables.length,
      latencyMs: rightSchema.latencyMs,
    },
    diff,
  });
}

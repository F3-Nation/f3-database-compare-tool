import { NextResponse } from "next/server";
import "@/lib/platforms";
import { getConfiguredPlatforms } from "@/lib/platforms/registry";

export async function GET() {
  const platforms = getConfiguredPlatforms();

  const results = await Promise.all(
    platforms.map(async (p) => {
      try {
        const tableResult = await p.runQuery(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            AND table_type = 'BASE TABLE'
        `);
        const tableCount = Number(tableResult.rows[0]?.count ?? 0);

        let sampleRowCount = 0;
        try {
          const usersResult = await p.runQuery(
            "SELECT COUNT(*) as count FROM public.users",
          );
          sampleRowCount = Number(usersResult.rows[0]?.count ?? 0);
        } catch {
          // users table may not exist
        }

        return {
          platformId: p.id,
          name: p.name,
          tableCount,
          sampleRowCount,
          ready: tableCount > 0 && sampleRowCount > 0,
        };
      } catch {
        return {
          platformId: p.id,
          name: p.name,
          tableCount: 0,
          sampleRowCount: 0,
          ready: false,
        };
      }
    }),
  );

  return NextResponse.json(results);
}

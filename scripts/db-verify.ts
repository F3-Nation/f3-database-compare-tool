import { Pool } from "pg";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const target = process.argv[2];

if (!target) {
  console.error("Usage: db-verify.ts <target>");
  console.error("Targets: gcp, local, neon, supabase");
  process.exit(1);
}

const envKeyMap: Record<string, string> = {
  gcp: "DATABASE_URL_GCP",
  local: "DATABASE_URL_LOCAL",
  neon: "DATABASE_URL_NEON",
  supabase: "DATABASE_URL_SUPABASE",
};

const envKey = envKeyMap[target];
if (!envKey) {
  console.error(`Unknown target: ${target}`);
  process.exit(1);
}

const connectionString = process.env[envKey];
if (!connectionString) {
  console.error(`${envKey} is not set. Add it to .env.local`);
  process.exit(1);
}

async function verify() {
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

  try {
    // Health check
    console.log(`Verifying ${target}...`);
    const versionResult = await pool.query("SELECT version()");
    console.log(`Version: ${versionResult.rows[0].version}`);

    // Table count
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type = 'BASE TABLE'
    `);
    console.log(`Tables: ${tablesResult.rows[0].count}`);

    // List tables
    const tableListResult = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    console.log("\nTable list:");
    for (const row of tableListResult.rows) {
      // Get row count for each table
      try {
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM "${row.table_schema}"."${row.table_name}"`,
        );
        console.log(
          `  ${row.table_schema}.${row.table_name}: ${countResult.rows[0].count} rows`,
        );
      } catch {
        console.log(`  ${row.table_schema}.${row.table_name}: (count failed)`);
      }
    }

    console.log(`\n${target} verification PASSED`);
  } catch (err) {
    console.error(`${target} verification FAILED:`, err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();

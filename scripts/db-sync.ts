import { Pool } from "pg";
import { resolve } from "path";
import { config } from "dotenv";
import { execSync } from "child_process";
import { createInterface } from "readline";
import { existsSync } from "fs";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const target = process.argv[2];

if (!target) {
  console.error("Usage: db-sync.ts <target>");
  console.error("Targets: local, neon, supabase, all");
  process.exit(1);
}

if (target === "gcp") {
  console.error(
    "ERROR: Refusing to sync to GCP — it is the read-only source of truth.",
  );
  console.error("Use `npm run db:pull:dump` to pull data FROM GCP.");
  process.exit(1);
}

const validTargets = ["local", "neon", "supabase", "all"];
if (!validTargets.includes(target)) {
  console.error(`Unknown target: ${target}. Use: ${validTargets.join(", ")}`);
  process.exit(1);
}

const envKeyMap: Record<string, string> = {
  local: "DATABASE_URL_LOCAL",
  neon: "DATABASE_URL_NEON",
  supabase: "DATABASE_URL_SUPABASE",
};

const dumpDir = resolve(__dirname, "../dumps");
const schemaPath = resolve(dumpDir, "schema.sql");
const dataPath = resolve(dumpDir, "data.sql");

function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

function run(cmd: string) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: resolve(__dirname, "..") });
}

async function resetLocal() {
  console.log("Tearing down Docker volumes and restarting...");
  run("docker compose down -v");
  run("docker compose up -d");

  console.log("Waiting for Postgres to be ready...");
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      execSync("docker compose exec -T postgres pg_isready -U postgres", {
        stdio: "pipe",
        cwd: resolve(__dirname, ".."),
      });
      console.log("Postgres is ready.");
      break;
    } catch {
      if (i === maxAttempts - 1) {
        console.error("Postgres did not become ready in time.");
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  run("bash scripts/db-migrate.sh local");
  run("bash scripts/db-seed.sh local");
}

async function resetRemote(t: string) {
  const envKey = envKeyMap[t];
  const connectionString = process.env[envKey];
  if (!connectionString) {
    console.error(`${envKey} is not set. Add it to .env.local`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

  try {
    console.log(`Dropping schemas on ${t}...`);
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS codex CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS regionpages CASCADE");
    await pool.query("CREATE SCHEMA public");
    console.log("Schemas dropped and public recreated.");
  } finally {
    await pool.end();
  }

  run(`bash scripts/db-migrate.sh ${t}`);
  run(`bash scripts/db-seed.sh ${t}`);
}

async function verify(t: string) {
  const envKey = envKeyMap[t];
  const connectionString = process.env[envKey];
  if (!connectionString) {
    console.error(`${envKey} is not set — skipping verification.`);
    return;
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

  try {
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type = 'BASE TABLE'
    `);
    const tableCount = tablesResult.rows[0].count;

    let userCount = "N/A";
    try {
      const usersResult = await pool.query(
        "SELECT COUNT(*) as count FROM public.users",
      );
      userCount = usersResult.rows[0].count;
    } catch {
      // users table may not exist
    }

    let attendanceCount = "N/A";
    try {
      const attendanceResult = await pool.query(
        "SELECT COUNT(*) as count FROM public.attendance",
      );
      attendanceCount = attendanceResult.rows[0].count;
    } catch {
      // attendance table may not exist
    }

    console.log(`\n  Verification for ${t}:`);
    console.log(`    Tables: ${tableCount}`);
    console.log(`    Users: ${userCount}`);
    console.log(`    Attendance: ${attendanceCount}`);
  } catch (err) {
    console.error(
      `  Verification failed for ${t}:`,
      err instanceof Error ? err.message : err,
    );
  } finally {
    await pool.end();
  }
}

async function syncTarget(t: string) {
  const start = performance.now();
  console.log(`\n========== Syncing ${t} ==========\n`);

  if (t === "local") {
    await resetLocal();
  } else {
    await resetRemote(t);
  }

  await verify(t);

  const duration = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`\n  ${t} sync complete in ${duration}s`);
}

async function main() {
  // Check dumps exist
  if (!existsSync(schemaPath)) {
    console.error(`ERROR: ${schemaPath} not found.`);
    console.error("Run `npm run db:pull:dump` first to pull from GCP.");
    process.exit(1);
  }
  if (!existsSync(dataPath)) {
    console.error(`ERROR: ${dataPath} not found.`);
    console.error("Run `npm run db:pull:dump` first to pull from GCP.");
    process.exit(1);
  }

  const targets = target === "all" ? ["local", "neon", "supabase"] : [target];

  // Verify env vars for all targets
  for (const t of targets) {
    const envKey = envKeyMap[t];
    if (!process.env[envKey]) {
      console.error(`${envKey} is not set. Add it to .env.local`);
      process.exit(1);
    }
  }

  // Safety check
  const allowDestructive = process.env.DB_SYNC_ALLOW_DESTRUCTIVE === "true";

  if (!allowDestructive) {
    const confirmed = await confirm(
      `Sync ${targets.join(", ")}? This will DESTROY all existing data on these targets.`,
    );
    if (!confirmed) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  for (const t of targets) {
    await syncTarget(t);
  }

  console.log("\nAll syncs complete.");
}

main();

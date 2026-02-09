import { Pool } from "pg";
import { resolve } from "path";
import { config } from "dotenv";
import { execSync } from "child_process";
import { createInterface } from "readline";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const target = process.argv[2];

if (!target) {
  console.error("Usage: db-reset.ts <target>");
  console.error("Targets: local, neon, supabase");
  process.exit(1);
}

if (target === "gcp") {
  console.error(
    "ERROR: Refusing to reset GCP — it is the read-only source of truth.",
  );
  process.exit(1);
}

const envKeyMap: Record<string, string> = {
  local: "DATABASE_URL_LOCAL",
  neon: "DATABASE_URL_NEON",
  supabase: "DATABASE_URL_SUPABASE",
};

const envKey = envKeyMap[target];
if (!envKey) {
  console.error(`Unknown target: ${target}. Use: local, neon, supabase`);
  process.exit(1);
}

const connectionString = process.env[envKey];
if (!connectionString) {
  console.error(`${envKey} is not set. Add it to .env.local`);
  process.exit(1);
}

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

  // Wait for pg_isready
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

async function resetRemote() {
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

  try {
    console.log(`Dropping schemas on ${target}...`);
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS codex CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS regionpages CASCADE");
    await pool.query("CREATE SCHEMA public");
    console.log("Schemas dropped and public recreated.");
  } finally {
    await pool.end();
  }

  run(`bash scripts/db-migrate.sh ${target}`);
  run(`bash scripts/db-seed.sh ${target}`);
}

async function main() {
  const confirmed = await confirm(
    `Reset ${target}? This will destroy ALL data.`,
  );
  if (!confirmed) {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log(`\nResetting ${target}...`);

  if (target === "local") {
    await resetLocal();
  } else {
    await resetRemote();
  }

  console.log(`\n${target} reset complete.`);
}

main();

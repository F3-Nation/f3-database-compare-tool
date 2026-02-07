import { execSync } from "child_process";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const DATABASE_URL_GCP = process.env.DATABASE_URL_GCP;

if (!DATABASE_URL_GCP) {
  console.error("DATABASE_URL_GCP is not set. Add it to .env.local");
  process.exit(1);
}

console.log("Pulling schema from GCP via drizzle-kit introspect...");

try {
  execSync("npx drizzle-kit introspect", {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL_GCP,
    },
  });
  console.log("Schema introspection complete. Check ./drizzle/ directory.");
} catch (err) {
  console.error("Schema pull failed:", err);
  process.exit(1);
}

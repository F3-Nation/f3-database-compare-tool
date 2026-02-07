import { Pool } from "pg";
import { writeFileSync, mkdirSync, createWriteStream } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local") });

const DATABASE_URL_GCP = process.env.DATABASE_URL_GCP;
if (!DATABASE_URL_GCP) {
  console.error("DATABASE_URL_GCP is not set. Add it to .env.local");
  process.exit(1);
}

const dumpsDir = resolve(__dirname, "../dumps");
mkdirSync(dumpsDir, { recursive: true });

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL_GCP,
    connectionTimeoutMillis: 30000,
  });

  try {
    console.log("Pulling data from GCP (COPY format)...");
    console.log("NOTE: Schema should be dumped separately via pg_dump.");
    await generateDataSql(pool);
    console.log("Data dump complete.");
  } finally {
    await pool.end();
  }
}

async function generateSchemaSql(pool: Pool): Promise<string> {
  const schemas = await pool.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'drizzle', 'auth', 'temp')
    ORDER BY schema_name
  `);

  const lines: string[] = [
    "-- Schema dump from GCP",
    `-- Generated at ${new Date().toISOString()}`,
    "",
  ];

  for (const s of schemas.rows) {
    if (s.schema_name !== "public") {
      lines.push(`CREATE SCHEMA IF NOT EXISTS ${s.schema_name};`);
    }
  }
  lines.push("");

  const tables = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'drizzle', 'auth', 'temp')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);

  for (const table of tables.rows) {
    const fullName = `"${table.table_schema}"."${table.table_name}"`;
    const cols = await pool.query(
      `
      SELECT column_name, data_type, udt_name, is_nullable, column_default,
             character_maximum_length, numeric_precision, numeric_scale,
             is_identity, identity_generation
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
      [table.table_schema, table.table_name],
    );

    lines.push(`CREATE TABLE IF NOT EXISTS ${fullName} (`);
    const colDefs: string[] = [];
    for (const col of cols.rows) {
      const typeName = getColumnType(col);
      let def = `  "${col.column_name}" ${typeName}`;
      if (col.column_default && col.is_identity !== "YES") {
        def += ` DEFAULT ${col.column_default}`;
      }
      if (col.is_identity === "YES") {
        def += ` GENERATED ${col.identity_generation === "ALWAYS" ? "ALWAYS" : "BY DEFAULT"} AS IDENTITY`;
      }
      if (col.is_nullable === "NO") {
        def += " NOT NULL";
      }
      colDefs.push(def);
    }

    const pk = await pool.query(
      `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = $1 AND tc.table_name = $2
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `,
      [table.table_schema, table.table_name],
    );

    if (pk.rows.length > 0) {
      const pkCols = pk.rows.map((r) => `"${r.column_name}"`).join(", ");
      colDefs.push(`  PRIMARY KEY (${pkCols})`);
    }

    lines.push(colDefs.join(",\n"));
    lines.push(");");
    lines.push("");
  }

  const indexes = await pool.query(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'drizzle', 'auth', 'temp')
      AND indexdef NOT LIKE '%PRIMARY%'
      AND indexname NOT LIKE '%_pkey'
    ORDER BY schemaname, tablename, indexname
  `);

  if (indexes.rows.length > 0) {
    lines.push("-- Indexes");
    for (const idx of indexes.rows) {
      lines.push(`${idx.indexdef};`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function getColumnType(col: Record<string, unknown>): string {
  const udtName = col.udt_name as string;
  const dataType = col.data_type as string;
  const maxLen = col.character_maximum_length as number | null;
  const numPrecision = col.numeric_precision as number | null;
  const numScale = col.numeric_scale as number | null;

  switch (dataType) {
    case "character varying":
      return maxLen ? `VARCHAR(${maxLen})` : "VARCHAR";
    case "character":
      return maxLen ? `CHAR(${maxLen})` : "CHAR";
    case "numeric":
      if (numPrecision && numScale)
        return `NUMERIC(${numPrecision}, ${numScale})`;
      if (numPrecision) return `NUMERIC(${numPrecision})`;
      return "NUMERIC";
    case "ARRAY":
      return `${udtName.replace(/^_/, "")}[]`;
    case "USER-DEFINED":
      return udtName;
    default:
      return dataType;
  }
}

// Escape a value for COPY tab-delimited format
function escapeCopyValue(val: unknown): string {
  if (val === null || val === undefined) return "\\N";
  if (typeof val === "boolean") return val ? "t" : "f";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    const inner = val
      .map((v) => (v === null ? "NULL" : `"${String(v).replace(/"/g, '\\"')}"`))
      .join(",");
    return `{${inner}}`;
  }
  if (typeof val === "object") {
    return JSON.stringify(val)
      .replace(/\\/g, "\\\\")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }
  return String(val)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

async function generateDataSql(pool: Pool): Promise<void> {
  const outPath = resolve(dumpsDir, "data.sql");
  const stream = createWriteStream(outPath);

  const write = (s: string) =>
    new Promise<void>((res) => {
      if (!stream.write(s)) {
        stream.once("drain", res);
      } else {
        res();
      }
    });

  await write("-- Data dump from GCP (COPY format)\n");
  await write(`-- Generated at ${new Date().toISOString()}\n\n`);
  await write("SET session_replication_role = replica;\n\n");

  const tables = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'drizzle', 'auth', 'temp')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);

  for (const table of tables.rows) {
    const fullName = `"${table.table_schema}"."${table.table_name}"`;

    let count: number;
    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) as c FROM ${fullName}`,
      );
      count = parseInt(countResult.rows[0].c);
    } catch {
      console.warn(`  Skipping ${fullName} (count failed)`);
      continue;
    }

    if (count === 0) {
      console.log(`  ${fullName}: 0 rows (skipping)`);
      continue;
    }

    console.log(`  ${fullName}: ${count} rows`);

    const colsResult = await pool.query(
      `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
      [table.table_schema, table.table_name],
    );
    const colNames = colsResult.rows
      .map((r) => `"${r.column_name}"`)
      .join(", ");
    const colKeys = colsResult.rows.map((r) => r.column_name);

    // Use COPY FROM stdin format — handles all escaping correctly
    await write(`COPY ${fullName} (${colNames}) FROM stdin;\n`);

    const batchSize = 5000;
    let offset = 0;

    while (offset < count) {
      const dataResult = await pool.query(
        `SELECT * FROM ${fullName} LIMIT ${batchSize} OFFSET ${offset}`,
      );

      for (const row of dataResult.rows) {
        const values = colKeys.map((k) => escapeCopyValue(row[k])).join("\t");
        await write(values + "\n");
      }

      offset += batchSize;
      if (offset < count && offset % 50000 === 0) {
        console.log(`    ... ${offset}/${count}`);
      }
    }

    await write("\\.\n\n");
  }

  await write("SET session_replication_role = DEFAULT;\n");

  await new Promise<void>((res) => stream.end(res));

  const { statSync } = await import("fs");
  const stats = statSync(outPath);
  console.log(`Data dump saved (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error("Dump failed:", err);
  process.exit(1);
});

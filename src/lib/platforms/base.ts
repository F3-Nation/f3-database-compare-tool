import { Pool } from "pg";
import {
  DatabasePlatform,
  HealthCheckResult,
  PlatformId,
  QueryResult,
  SchemaInfo,
  SchemaTable,
  SchemaColumn,
} from "./types";

export abstract class BasePgPlatform implements DatabasePlatform {
  abstract id: PlatformId;
  abstract name: string;
  abstract envKey: string;

  private pool: Pool | null = null;

  isConfigured(): boolean {
    return !!process.env[this.envKey];
  }

  private getPool(): Pool {
    if (!this.pool) {
      const connectionString = process.env[this.envKey];
      if (!connectionString) {
        throw new Error(`${this.envKey} is not configured`);
      }
      this.pool = new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return this.pool;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const pool = this.getPool();
      const result = await pool.query("SELECT version()");
      const latencyMs = performance.now() - start;
      return {
        ok: true,
        latencyMs,
        version: result.rows[0]?.version as string,
      };
    } catch (err) {
      const latencyMs = performance.now() - start;
      return {
        ok: false,
        latencyMs,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async runQuery(sql: string): Promise<QueryResult> {
    const start = performance.now();
    try {
      const pool = this.getPool();
      const result = await pool.query(sql);
      const latencyMs = performance.now() - start;
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
        fields: result.fields.map((f) => f.name),
        latencyMs,
      };
    } catch (err) {
      const latencyMs = performance.now() - start;
      return {
        rows: [],
        rowCount: 0,
        fields: [],
        latencyMs,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getSchema(): Promise<SchemaInfo> {
    const start = performance.now();
    const pool = this.getPool();

    const tablesResult = await pool.query<{
      table_schema: string;
      table_name: string;
    }>(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);

    const columnsResult = await pool.query<{
      table_schema: string;
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      ordinal_position: number;
    }>(`
      SELECT table_schema, table_name, column_name, data_type,
             is_nullable, column_default, ordinal_position
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name, ordinal_position
    `);

    const columnsByTable = new Map<string, SchemaColumn[]>();
    for (const col of columnsResult.rows) {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!columnsByTable.has(key)) {
        columnsByTable.set(key, []);
      }
      columnsByTable.get(key)!.push({
        name: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === "YES",
        columnDefault: col.column_default,
        ordinalPosition: col.ordinal_position,
      });
    }

    const tables: SchemaTable[] = tablesResult.rows.map((t) => ({
      name: t.table_name,
      schema: t.table_schema,
      columns: columnsByTable.get(`${t.table_schema}.${t.table_name}`) ?? [],
    }));

    const latencyMs = performance.now() - start;
    return { tables, latencyMs };
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

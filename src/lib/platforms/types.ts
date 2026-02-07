export type PlatformId = "gcp" | "local" | "neon" | "supabase";

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
  version?: string;
  error?: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: string[];
  latencyMs: number;
  error?: string;
}

export interface SchemaTable {
  name: string;
  schema: string;
  columns: SchemaColumn[];
}

export interface SchemaColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  ordinalPosition: number;
}

export interface SchemaInfo {
  tables: SchemaTable[];
  latencyMs: number;
}

export interface DatabasePlatform {
  id: PlatformId;
  name: string;
  envKey: string;
  isConfigured(): boolean;
  healthCheck(): Promise<HealthCheckResult>;
  runQuery(sql: string): Promise<QueryResult>;
  getSchema(): Promise<SchemaInfo>;
  disconnect(): Promise<void>;
}

import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const latencySnapshots = pgTable(
  "latency_snapshots",
  {
    id: serial("id").primaryKey(),
    platformId: varchar("platform_id", { length: 20 }).notNull(),
    environment: varchar("environment", { length: 20 }).notNull(),
    latencyMs: integer("latency_ms").notNull(),
    ok: boolean("ok").notNull(),
    error: text("error"),
    version: text("version"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_platform_env").on(table.platformId, table.environment),
    index("idx_created_at").on(table.createdAt),
  ],
);

export type LatencySnapshot = typeof latencySnapshots.$inferSelect;
export type NewLatencySnapshot = typeof latencySnapshots.$inferInsert;

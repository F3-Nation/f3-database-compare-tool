# Architecture

## Stack

Next.js 15 + React 19 + App Router + TypeScript strict. UI: shadcn/ui, Tailwind v3, Recharts. DB: raw `pg` Pool per platform (no ORM). Docker Postgres 16 on :5433. App on :3002.

## Plugin Model

`BasePgPlatform` abstract class (`src/lib/platforms/base.ts`) -> GCP, Local, Neon, Supabase implementations. Registry: `Map<PlatformId, DatabasePlatform>` in registry.ts, auto-registered in index.ts.

## Key Patterns

- Health checks: `SELECT 1` + version query
- Schema introspection: information_schema queries
- Side-by-side query execution with timing
- Diff highlighting for schema and data comparison

## Env Variables

- `DATABASE_URL_GCP` — Source of truth
- `DATABASE_URL_LOCAL` — Docker Postgres
- `DATABASE_URL_NEON` — Neon target
- `DATABASE_URL_SUPABASE` — Supabase target

## API Routes

| Method | Route                    | Purpose                       |
| ------ | ------------------------ | ----------------------------- |
| GET    | /api/platforms           | All platforms + health        |
| GET    | /api/health/[platformId] | Single health check           |
| POST   | /api/query               | Execute query on platform     |
| POST   | /api/compare             | Side-by-side query comparison |
| POST   | /api/compare/schema      | Schema diff                   |

# F3 Database Compare Tool — App Brain

## Mission

Side-by-side PostgreSQL platform comparison (GCP, Local, Neon, Supabase) for hosting migration evaluation.

## Status: COMPLETE (all phases 0-8 done)

## Key Commands

```bash
npm run dev              # Start on port 3002
npm run build            # Production build
npm run lint             # ESLint (--max-warnings 0)
npm run typecheck        # TypeScript strict check
npm run test             # Vitest (9 tests)
npm run test:coverage    # Vitest with v8 coverage
npm run db:up            # Start local Postgres 16 on :5433
npm run db:down          # Stop local Postgres
npm run db:pull:dump     # tsx script: pull schema + data from GCP
npm run db:reset:<target>     # Drop all + re-migrate + seed (local/neon/supabase, NEVER gcp)
npm run db:migrate:<target>   # Apply schema.sql (local/neon/supabase)
npm run db:seed:<target>      # Apply data.sql (local/neon/supabase)
npm run db:verify:local       # Health check local Docker
npm run db:verify:gcp         # Health check GCP
npm run db:verify:neon        # Health check Neon
npm run db:verify:supabase    # Health check Supabase
npm run db:generate           # Drizzle generate migrations
npm run db:migrate:metadata   # Push schema to metadata DB
npm run db:studio             # Drizzle Studio GUI
```

## Stack

- Next.js 15, React 19, App Router, TypeScript strict
- shadcn/ui + Tailwind v3 + Recharts
- Raw `pg` Pool per platform (no ORM for comparison queries)
- Drizzle ORM for metadata DB (latency analytics)
- Docker Postgres 16 on :5433, app on :3002

## Plugin System

`BasePgPlatform` abstract class in `src/lib/platforms/base.ts`

- Manages Pool lifecycle, health checks, query execution, schema introspection
- 4 implementations: gcp.ts, local.ts, neon.ts, supabase.ts
- Registry in registry.ts, auto-registered in index.ts

## API Routes

- `GET /api/platforms` — All platforms + health status
- `GET /api/health/[platformId]` — Single platform health
- `POST /api/query` — {platformId, sql} -> QueryResult
- `POST /api/compare` — {leftId, rightId, sql} -> side-by-side
- `POST /api/compare/schema` — {leftId, rightId} -> schema diff
- `POST /api/cron/latency` — Collect health snapshots (QStash target)
- `GET /api/analytics/latency` — Query latency history + stats

## Env Variables

`DATABASE_URL_GCP`, `DATABASE_URL_LOCAL`, `DATABASE_URL_NEON`, `DATABASE_URL_SUPABASE`, `DATABASE_URL_METADATA`, `APP_ENVIRONMENT`, `CRON_SECRET`

## Database Stats (GCP Source)

- 43 tables across public, codex, regionpages schemas
- 2.1M attendance rows, 700K event_instances, 54K users
- Data dump: 1.7 GB

## Constraints

- Port 3002 always
- Never deploy to Firebase
- Never commit .env.local or .env.firebase
- Dumps are gitignored
- Env files are gitignored (except .env.example)
- CLAUDE.md must stay under 8KB

## .context/ Index

- `architecture.md` — Key patterns, env vars, API routes
- `status.md` — Phase progress tracker
- `pax-vault-patterns.md` — Patterns borrowed from PAX-VAULT

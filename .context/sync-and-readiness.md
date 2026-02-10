# Sync & Readiness

## How Sync Works

1. **Pull from GCP**: `npm run db:pull:dump` exports schema + data from GCP source of truth into `dumps/schema.sql` and `dumps/data.sql` (gitignored).
2. **Sync to targets**: `npm run db:sync:<target>` destroys the target database and re-applies schema + data from the dumps.
   - Supported targets: `local`, `neon`, `supabase`, `all`
   - `gcp` is always refused (read-only source)
3. **Safety**: Requires either `DB_SYNC_ALLOW_DESTRUCTIVE=true` env var or interactive `y/N` confirmation.
4. **Verification**: After sync completes, the script prints table count and key row counts (users, attendance).

### Scripts

```bash
npm run db:sync:local      # Sync dumps -> local Docker
npm run db:sync:neon       # Sync dumps -> Neon
npm run db:sync:supabase   # Sync dumps -> Supabase
npm run db:sync:all        # Sync dumps -> all three targets sequentially
```

### Prerequisites

- `dumps/schema.sql` and `dumps/data.sql` must exist (run `npm run db:pull:dump` first)
- Target env vars must be set in `.env.local` (`DATABASE_URL_LOCAL`, `DATABASE_URL_NEON`, `DATABASE_URL_SUPABASE`)

## Readiness Check API

### `GET /api/readiness`

Returns an array of platform readiness statuses:

```json
[
  {
    "platformId": "gcp",
    "name": "GCP (Source)",
    "tableCount": 43,
    "sampleRowCount": 54000,
    "ready": true
  },
  {
    "platformId": "neon",
    "name": "Neon",
    "tableCount": 0,
    "sampleRowCount": 0,
    "ready": false
  }
]
```

- Checks `information_schema.tables` for table count
- Checks `public.users` row count as a sentinel
- `ready = tableCount > 0 && sampleRowCount > 0`
- Each platform check is wrapped in try/catch (unreachable platforms return `ready: false`)

### UI Integration

- Platform pills show an amber warning dot when a platform is not ready
- Warning cards appear below the pill selector for selected platforms that are not ready
- The DataDiff component shows diagnostic hints when one side returns 0 rows
- The Performance Chart shows warning banners when row counts differ

## Troubleshooting

1. **"dumps not found" error**: Run `npm run db:pull:dump` to export from GCP
2. **Env var not set**: Add `DATABASE_URL_<TARGET>` to `.env.local`
3. **Platform shows 0 tables after sync**: Check that `db-migrate.sh` and `db-seed.sh` completed without errors. Run `npm run db:verify:<target>` for details.
4. **Neon/Supabase connection timeout**: Check that IP allowlists include your current IP

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DUMPS_DIR="$PROJECT_ROOT/dumps"

# Load .env.local
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  set -a
  source "$PROJECT_ROOT/.env.local"
  set +a
fi

if [[ -z "${DATABASE_URL_GCP:-}" ]]; then
  echo "ERROR: DATABASE_URL_GCP is not set. Add it to .env.local"
  exit 1
fi

mkdir -p "$DUMPS_DIR"

# Only dump schemas we have access to
SCHEMAS="--schema=public --schema=codex --schema=regionpages"

echo "Dumping schema from GCP (public, codex, regionpages)..."
pg_dump "$DATABASE_URL_GCP" --schema-only --no-owner --no-privileges $SCHEMAS > "$DUMPS_DIR/schema.sql"
echo "Schema dump saved to dumps/schema.sql"

echo "Dumping data from GCP..."
# Data dump: use --disable-triggers for circular FK constraints
# Try all schemas first, fall back to public-only if permission errors on sequences
if pg_dump "$DATABASE_URL_GCP" --data-only --no-owner --no-privileges --disable-triggers $SCHEMAS > "$DUMPS_DIR/data.sql" 2>/dev/null; then
  echo "Data dump saved to dumps/data.sql (all schemas)"
else
  echo "Some schemas have restricted sequences. Dumping public schema only..."
  pg_dump "$DATABASE_URL_GCP" --data-only --no-owner --no-privileges --disable-triggers --schema=public > "$DUMPS_DIR/data.sql"
  echo "Data dump saved to dumps/data.sql (public schema only)"
fi

echo "Done! Files:"
ls -lh "$DUMPS_DIR"/*.sql

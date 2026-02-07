#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DUMPS_DIR="$PROJECT_ROOT/dumps"
SCHEMA_FILE="$DUMPS_DIR/schema.sql"

TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "Usage: db-push-schema.sh <target>"
  echo "Targets: local, neon, supabase"
  exit 1
fi

# Load .env.local
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  set -a
  source "$PROJECT_ROOT/.env.local"
  set +a
fi

# Resolve target URL
case "$TARGET" in
  local)
    DB_URL="${DATABASE_URL_LOCAL:-}"
    ;;
  neon)
    DB_URL="${DATABASE_URL_NEON:-}"
    ;;
  supabase)
    DB_URL="${DATABASE_URL_SUPABASE:-}"
    ;;
  *)
    echo "ERROR: Unknown target '$TARGET'. Use: local, neon, supabase"
    exit 1
    ;;
esac

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DATABASE_URL_${TARGET^^} is not set. Add it to .env.local"
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "ERROR: $SCHEMA_FILE not found. Run 'npm run db:pull:dump' first."
  exit 1
fi

echo "Pushing schema to $TARGET..."
psql "$DB_URL" -f "$SCHEMA_FILE"
echo "Schema pushed to $TARGET successfully."

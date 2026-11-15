#!/usr/bin/env bash
# Database checks for supabase/migrations against a plain local Postgres, without Docker.
# For each check file: creates a throwaway database, adds stand-ins for Supabase's auth
# and storage schemas, applies every migration, then runs the checks.
#
#   access-rules.sql   row-level security for both roles (A-0.2)
#   admin-actions.sql  admin action functions (B-1.3)
#
# Usage: tests/rls/local-postgres/run.sh            (Postgres on localhost:5432)
#        PGPORT=54329 tests/rls/local-postgres/run.sh
set -euo pipefail

cd "$(dirname "$0")/../../.."
export PGHOST="${PGHOST:-localhost}" PGUSER="${PGUSER:-postgres}"
PSQL="psql -v ON_ERROR_STOP=1 -q"
DB=""

cleanup() { [ -n "$DB" ] && psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

for checks in tests/rls/local-postgres/access-rules.sql tests/rls/local-postgres/admin-actions.sql; do
  cleanup
  DB="rls_check_$$_$(basename "$checks" .sql | tr '-' '_')"
  echo "== $(basename "$checks")"
  psql -q -d postgres -c "create database $DB"
  $PSQL -d "$DB" -f tests/rls/local-postgres/supabase-stubs.sql
  for f in supabase/migrations/*.sql; do
    $PSQL -d "$DB" -f "$f"
  done
  psql -v ON_ERROR_STOP=1 -d "$DB" -f "$checks" 2>&1 | sed -n 's/.*NOTICE:  //p; /PASSED/p; /ERROR/p'
done

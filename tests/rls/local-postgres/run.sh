#!/usr/bin/env bash
# Access-rule (RLS) checks for supabase/migrations against a plain local Postgres,
# without Docker. Creates a throwaway database, adds stand-ins for Supabase's auth and
# storage schemas, applies every migration, then runs access-rules.sql.
#
# Usage: tests/rls/local-postgres/run.sh            (Postgres on localhost:5432)
#        PGPORT=54329 tests/rls/local-postgres/run.sh
set -euo pipefail

cd "$(dirname "$0")/../../.."
DB="rls_check_$$"
export PGHOST="${PGHOST:-localhost}" PGUSER="${PGUSER:-postgres}"
PSQL="psql -v ON_ERROR_STOP=1 -q"

cleanup() { psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql -q -d postgres -c "create database $DB"
$PSQL -d "$DB" -f tests/rls/local-postgres/supabase-stubs.sql
for f in supabase/migrations/*.sql; do
  $PSQL -d "$DB" -f "$f"
done
psql -v ON_ERROR_STOP=1 -d "$DB" -f tests/rls/local-postgres/access-rules.sql 2>&1 \
  | sed -n 's/.*NOTICE:  //p; /PASSED/p; /ERROR/p'

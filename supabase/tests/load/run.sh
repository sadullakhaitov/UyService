#!/usr/bin/env bash
# Yuklama sinovi (faqat LOKAL baza): bash supabase/tests/load/run.sh
#   CLIENTS=100 MASTERS=100 DURATION_S=300 HISTORY=20000 PGRST_BIN=/yo'l/postgrest DENO_BIN=deno
# Baza noldan yaratiladi (migratsiyalar + soxta foydalanuvchilar), PostgREST ishga tushadi, keyin load.ts.
# DB_POOL — PostgREST ulanishlari (Supabase kichik tariflarida ~10–20), CPUS — baza uchun yadrolar (taskset).
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-uyload}
P=(psql -v ON_ERROR_STOP=1 -q)
"${P[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
for f in tests/supabase_stub.sql migrations/*.sql; do
  "${P[@]}" -d "$DB" -f "$f" 2>&1 | grep -v "NOTICE:\|WARNING:\|HINT:" || true
done
"${P[@]}" -d "$DB" -v clients="${CLIENTS:-100}" -v masters="${MASTERS:-100}" -v history="${HISTORY:-20000}" -f tests/load/seed.sql
"${P[@]}" -d "$DB" -c "select pg_stat_statements_reset()" >/dev/null 2>&1 || true

export PGRST_DB_URI="postgres://${PGUSER:-postgres}${PGPASSWORD:+:$PGPASSWORD}@/$DB?host=${PGHOST:-/var/run/postgresql}&port=${PGPORT:-5432}"
export PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_SERVER_PORT=54330 PGRST_DB_POOL=${DB_POOL:-15}
export PGRST_JWT_SECRET=${PGRST_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}
export DISPATCH_ROUTING=${DISPATCH_ROUTING:-off}
taskset -c "${CPUS:-0,1}" "${PGRST_BIN:-postgrest}" > /tmp/uyservice-load-postgrest.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -sf -o /dev/null http://127.0.0.1:54330/ && break; sleep 0.5; done
"${DENO_BIN:-deno}" run --no-lock --node-modules-dir=none -A tests/load/load.ts > "${OUT:-/tmp/uyservice-load.json}"
echo "Natija: ${OUT:-/tmp/uyservice-load.json}"
# Bitta ustaga bir vaqtda ikki xil buyurtmadan taklif kelganmi (poyga holati)
"${P[@]}" -d "$DB" -c "select count(*) as ikki_taklif from public.offers a join public.offers b on a.master_id = b.master_id and a.order_id < b.order_id and a.sent_at < coalesce(b.responded_at, b.expires_at) and b.sent_at < coalesce(a.responded_at, a.expires_at)"

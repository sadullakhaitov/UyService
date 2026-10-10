#!/usr/bin/env bash
# Server sinovlari (lokal va GitHub Actions). Kerak: PostgreSQL 16 + PostGIS, psql.
#   bash supabase/tests/run.sh                      — SQL sinovlar (RLS, admin, narx kelishuvi, push, Telegram) + Deno unit
#   PGRST_BIN=/yo'l/postgrest bash supabase/tests/run.sh — + E2E (usta qidirish va push, Deno + PostgREST bilan)
# Ulanish — oddiy PG* o'zgaruvchilari (PGHOST, PGPORT, PGUSER, PGPASSWORD). Baza har safar noldan yaratiladi.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-uytest}
P=(psql -v ON_ERROR_STOP=1 -q)

fresh() {
  "${P[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
  for f in tests/supabase_stub.sql migrations/*.sql seed.sql "$@"; do
    "${P[@]}" -d "$DB" -f "$f" 2>&1 | grep -v "NOTICE:\|WARNING:\|HINT:" || true
    test "${PIPESTATUS[0]}" -eq 0 || { echo "XATO: $f"; exit 1; }
  done
}

echo "== SQL sinovlar"
"${P[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
for f in tests/supabase_stub.sql migrations/*.sql seed.sql tests/rls_test.sql tests/admin_test.sql tests/price_test.sql tests/push_test.sql tests/telegram_test.sql tests/master_cancel_test.sql tests/promo_test.sql tests/client_care_test.sql tests/admin_delete_test.sql tests/security_test.sql tests/free_pass_test.sql tests/presence_test.sql; do
  "${P[@]}" -d "$DB" -f "$f" 2>&1 | sed -n 's/.*NOTICE:  \(PASS.*\)/  \1/p; /ERROR\|FAIL/p'
  test "${PIPESTATUS[0]}" -eq 0 || { echo "XATO: $f"; exit 1; }
done
echo "SQL: hammasi o'tdi"

if [ -n "${DENO_BIN:-}" ] || command -v deno >/dev/null; then
  echo "== Unit (Deno)"
  "${DENO_BIN:-deno}" test --no-lock --node-modules-dir=none -q tests/unit/
fi

[ -z "${PGRST_BIN:-}" ] && exit 0
DENO=${DENO_BIN:-deno}
export PGRST_DB_URI="postgres://${PGUSER:-postgres}${PGPASSWORD:+:$PGPASSWORD}@/$DB?host=${PGHOST:-/var/run/postgresql}&port=${PGPORT:-5432}"
export PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_SERVER_PORT=54330
# Usta qidirish sinovlari taxminiy vaqt bilan (tashqi yo'l xizmatisiz — natija har safar bir xil)
export DISPATCH_ROUTING=off
export PGRST_JWT_SECRET=${PGRST_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}
for t in engine push otp freepass presence; do
  echo "== E2E: $t"
  fresh tests/e2e/fixture.sql
  "$PGRST_BIN" > /tmp/uyservice-postgrest.log 2>&1 &
  PID=$!
  for _ in $(seq 1 30); do curl -sf -o /dev/null http://127.0.0.1:54330/ && break; sleep 0.5; done
  set +e
  "$DENO" run --no-lock --node-modules-dir=none -A "tests/e2e/${t}_e2e.ts"
  RC=$?
  set -e
  kill $PID; wait $PID 2>/dev/null || true
  [ $RC -eq 0 ] || { echo "XATO: E2E $t"; tail -20 /tmp/uyservice-postgrest.log; exit $RC; }
done
echo "E2E: hammasi o'tdi"

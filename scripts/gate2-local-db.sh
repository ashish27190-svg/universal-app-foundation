#!/usr/bin/env bash
# Disposable LOCAL database test. No Supabase login, link, remote project or cloud secret.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/node_modules/.bin/supabase"

if [[ ! -x "$CLI" ]]; then
  echo "Supabase CLI is not installed. From repo root run: pnpm install --frozen-lockfile" >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker is required. Start Docker (Codespaces needs Docker access), then retry." >&2
  exit 2
fi

cd "$ROOT/infrastructure"
echo "Gate 2: starting isolated local Supabase. This does NOT contact a hosted project."
# Omit nonessential containers to reduce RAM usage; retain Auth/API for later tests.
"$CLI" start --exclude studio,imgproxy,mailpit,realtime,storage-api,logflare,vector,supavisor

echo "Gate 2: rebuilding ONLY local UAF database from checked-in migrations."
"$CLI" db reset --local --no-seed

echo "Gate 2: running transactional RLS/access-control assertions."
"$CLI" test db supabase/tests/database/gate2_rls_test.sql --local

echo "PASS: local migrations and pgTAP RLS checks completed."
echo "Note: this does NOT establish PowerSync cloud sync, Edge Function runtime, or multi-device proof."
echo "When finished inspecting locally: cd infrastructure && ../node_modules/.bin/supabase stop"

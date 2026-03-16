#!/usr/bin/env bash
set -euo pipefail

# ── Read .env ──────────────────────────────────────────────
read_env_value() {
  local key="$1"
  local file="${2:-.env}"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2-
}

UID_VAL=$(read_env_value "ADMIN_TELEGRAM_ID")
SECRET=$(read_env_value "WEBAPP_HMAC_SECRET")
BASE="http://127.0.0.1:4000"

if [ -z "$UID_VAL" ] || [ -z "$SECRET" ]; then
  echo "❌ ADMIN_TELEGRAM_ID or WEBAPP_HMAC_SECRET missing in .env"
  exit 1
fi

# ── HMAC helper ────────────────────────────────────────────
hmac_sig() {
  local uid="$1" ts="$2" secret="$3"
  echo -n "${uid}.${ts}" | openssl dgst -sha256 -hmac "$secret" -hex 2>/dev/null | awk '{print $NF}'
}

# ── Signed GET ─────────────────────────────────────────────
v2_get() {
  local path="$1"
  local ts
  ts=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
  local sig
  sig=$(hmac_sig "$UID_VAL" "$ts" "$SECRET")
  local sep="?"
  [[ "$path" == *"?"* ]] && sep="&"
  local url="${BASE}${path}${sep}uid=${UID_VAL}&ts=${ts}&sig=${sig}"
  curl -sf --max-time 20 "$url" 2>/dev/null || echo '{"success":false,"error":"curl_failed"}'
}

# ── Signed POST ────────────────────────────────────────────
v2_post() {
  local path="$1"
  local body_extra="$2"
  local ts
  ts=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
  local sig
  sig=$(hmac_sig "$UID_VAL" "$ts" "$SECRET")
  local payload
  payload=$(echo "$body_extra" | python3 -c "
import sys, json
extra = json.load(sys.stdin) if sys.stdin.readable() else {}
extra['uid'] = '$UID_VAL'
extra['ts'] = '$ts'
extra['sig'] = '$sig'
print(json.dumps(extra))
" 2>/dev/null || echo "{\"uid\":\"$UID_VAL\",\"ts\":\"$ts\",\"sig\":\"$sig\"}")
  curl -sf --max-time 20 -X POST -H "Content-Type: application/json" -d "$payload" "${BASE}${path}" 2>/dev/null || echo '{"success":false,"error":"curl_failed"}'
}

FAILURES=0
PASS=0

check_result() {
  local label="$1"
  local response="$2"
  local expect_success="${3:-true}"
  
  local success
  success=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('success',False)).lower())" 2>/dev/null || echo "false")
  
  if [ "$success" = "$expect_success" ]; then
    echo "  ✅ $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $label (success=$success expected=$expect_success)"
    FAILURES=$((FAILURES + 1))
  fi
}

# ── Start admin-api if not running ─────────────────────────
STARTED=false
ADMIN_PID=""

health=$(curl -sf --max-time 2 "${BASE}/healthz" 2>/dev/null || echo "")
if [ -z "$health" ]; then
  echo "🔄 Starting admin-api..."
  node apps/admin-api/src/index.js > tmp.admin-api.out.log 2> tmp.admin-api.err.log &
  ADMIN_PID=$!
  STARTED=true
  
  for i in $(seq 1 30); do
    sleep 0.5
    health=$(curl -sf --max-time 2 "${BASE}/healthz" 2>/dev/null || echo "")
    if [ -n "$health" ]; then
      break
    fi
  done
fi

if [ -z "$health" ]; then
  echo "❌ admin-api did not become healthy on :4000"
  [ -f tmp.admin-api.err.log ] && tail -20 tmp.admin-api.err.log
  exit 1
fi

echo "✅ admin-api healthy"

# ── Setup fixture ──────────────────────────────────────────
echo ""
echo "📦 Setting up smoke fixture..."
FIXTURE=$(node scripts/smoke_v5_1_fixture.mjs setup 2>/dev/null || echo '{"ok":false}')
FIXTURE_OK=$(echo "$FIXTURE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok',False)).lower())" 2>/dev/null || echo "false")
FIXTURE_REQUEST_ID=$(echo "$FIXTURE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('request_id',0))" 2>/dev/null || echo "0")
FIXTURE_KYC_USER_ID=$(echo "$FIXTURE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('kyc_user_id',0))" 2>/dev/null || echo "0")

if [ "$FIXTURE_OK" != "true" ] || [ "$FIXTURE_REQUEST_ID" = "0" ]; then
  echo "❌ Fixture setup failed"
  echo "$FIXTURE"
  # Cleanup
  [ "$STARTED" = "true" ] && [ -n "$ADMIN_PID" ] && kill "$ADMIN_PID" 2>/dev/null || true
  exit 1
fi
echo "  ✅ Fixture ready (request_id=$FIXTURE_REQUEST_ID, kyc_user_id=$FIXTURE_KYC_USER_ID)"

# ── Smoke tests ────────────────────────────────────────────
echo ""
echo "🧪 Running smoke tests..."

# Bootstrap
BOOT=$(v2_get "/webapp/api/v2/bootstrap?lang=tr")
check_result "GET /webapp/api/v2/bootstrap" "$BOOT" "true"

# Command catalog
CATALOG=$(v2_get "/webapp/api/v2/commands/catalog?lang=tr&include_admin=1&include_non_primary=0")
check_result "GET /webapp/api/v2/commands/catalog" "$CATALOG" "true"

# Monetization catalog
MONO_CAT=$(v2_get "/webapp/api/v2/monetization/catalog?lang=tr")
check_result "GET /webapp/api/v2/monetization/catalog" "$MONO_CAT" "true"

# Monetization status
MONO_STATUS=$(v2_get "/webapp/api/v2/monetization/status?lang=tr")
check_result "GET /webapp/api/v2/monetization/status" "$MONO_STATUS" "true"

# Payout status
PAYOUT=$(v2_get "/webapp/api/v2/payout/status")
check_result "GET /webapp/api/v2/payout/status" "$PAYOUT" "true"

# PvP progression
PVP=$(v2_get "/webapp/api/v2/pvp/progression")
check_result "GET /webapp/api/v2/pvp/progression" "$PVP" "true"

# Wallet session
WALLET=$(v2_get "/webapp/api/v2/wallet/session")
check_result "GET /webapp/api/v2/wallet/session" "$WALLET" "true"

# Admin queue
QUEUE=$(v2_get "/webapp/api/v2/admin/queue/unified")
check_result "GET /webapp/api/v2/admin/queue/unified" "$QUEUE" "true"

# ── Bootstrap shape validation ─────────────────────────────
echo ""
echo "🔍 Validating response shapes..."

BOOT_KEYS=$(echo "$BOOT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin).get('data', {})
    required = ['api_version','ux','payout_lock','pvp_content','command_catalog','runtime_flags_effective','wallet_capabilities']
    missing = [k for k in required if k not in d]
    if missing:
        print('FAIL:' + ','.join(missing))
    else:
        print('OK')
except:
    print('FAIL:parse_error')
" 2>/dev/null || echo "FAIL:python_error")

if [[ "$BOOT_KEYS" == "OK" ]]; then
  echo "  ✅ bootstrap.data shape valid"
  PASS=$((PASS + 1))
else
  echo "  ❌ bootstrap.data missing keys: $BOOT_KEYS"
  FAILURES=$((FAILURES + 1))
fi

# ── Queue action confirm flow ──────────────────────────────
echo ""
echo "🔐 Testing queue action confirm flow..."

CONFIRM1=$(v2_post "/webapp/api/v2/admin/queue/action" "{\"action_key\":\"payout_reject\",\"kind\":\"payout_request\",\"request_id\":$FIXTURE_REQUEST_ID,\"action_request_id\":\"smoke_q_${FIXTURE_REQUEST_ID}_a1\",\"reason\":\"smoke\"}")
C1_SUCCESS=$(echo "$CONFIRM1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('success',False)).lower())" 2>/dev/null || echo "false")
# Step 1 should return 409 (needs confirm) = success=false
check_result "queue/action confirm-1 (expect pending)" "$CONFIRM1" "false"

CONFIRM_TOKEN=$(echo "$CONFIRM1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('confirm_token',''))" 2>/dev/null || echo "")

if [ -n "$CONFIRM_TOKEN" ]; then
  CONFIRM2=$(v2_post "/webapp/api/v2/admin/queue/action" "{\"action_key\":\"payout_reject\",\"kind\":\"payout_request\",\"request_id\":$FIXTURE_REQUEST_ID,\"action_request_id\":\"smoke_q_${FIXTURE_REQUEST_ID}_a1\",\"reason\":\"smoke\",\"confirm_token\":\"$CONFIRM_TOKEN\"}")
  check_result "queue/action confirm-2 (expect success)" "$CONFIRM2" "true"
fi

# ── Cleanup ────────────────────────────────────────────────
echo ""
echo "🧹 Cleaning up fixture..."
CLEANUP_ARGS="scripts/smoke_v5_1_fixture.mjs cleanup --request-id $FIXTURE_REQUEST_ID"
if [ "$FIXTURE_KYC_USER_ID" != "0" ]; then
  CLEANUP_ARGS="$CLEANUP_ARGS --kyc-user-id $FIXTURE_KYC_USER_ID"
fi
node $CLEANUP_ARGS 2>/dev/null || echo "  ⚠️ Fixture cleanup warning"

if [ "$STARTED" = "true" ] && [ -n "$ADMIN_PID" ]; then
  kill "$ADMIN_PID" 2>/dev/null || true
  echo "  ✅ admin-api stopped"
fi

# ── Summary ────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Smoke Results: $PASS passed, $FAILURES failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAILURES" -gt 0 ]; then
  echo "❌ Smoke gate FAILED"
  exit 1
fi

echo "✅ Smoke gate PASSED"
exit 0

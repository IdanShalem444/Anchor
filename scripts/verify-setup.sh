#!/usr/bin/env bash
# Read-only check that the billing schema is applied in Supabase.
# Uses the URL + service key from .env.local. Prints ✅/❌ only — no secrets.
set -uo pipefail
cd "$(dirname "$0")/.."

getval() {
  local l
  l=$(grep -m1 "^$1=" .env.local 2>/dev/null || true)
  l=${l#*=}; l=${l%\"}; l=${l#\"}; l=${l%$'\r'}
  printf '%s' "$l"
}

URL=$(getval NEXT_PUBLIC_SUPABASE_URL); URL=${URL%/}
KEY=$(getval SUPABASE_SERVICE_ROLE_KEY)

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"; exit 1
fi

H_KEY="apikey: $KEY"
H_AUTH="Authorization: Bearer $KEY"

code_get() {
  curl -s -o /dev/null -w '%{http_code}' "$URL/rest/v1/$1?select=*&limit=1" -H "$H_KEY" -H "$H_AUTH"
}
code_rpc() {
  # POST to a stored function. 404 => function doesn't exist (schema not run).
  curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/rpc/$1" \
    -H "$H_KEY" -H "$H_AUTH" -H "Content-Type: application/json" -d "$2"
}

echo "→ Control: does the existing 'profiles' table respond?"
echo "   profiles → HTTP $(code_get profiles)"
echo ""
echo "→ Billing functions the app actually calls (404 = schema NOT run):"
echo "   consume_ai_credit → HTTP $(code_rpc consume_ai_credit '{"p_limit":1}')"
echo "   redeem_code       → HTTP $(code_rpc redeem_code '{"p_code":"__verify_probe__"}')"
echo ""
echo "Read: 200/2xx on the functions = schema applied ✅.  404 = not applied ❌ (run supabase/schema.sql)."

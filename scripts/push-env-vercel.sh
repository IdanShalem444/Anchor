#!/usr/bin/env bash
# Push the billing-related env vars from .env.local into Vercel
# (Production + Preview). Re-runnable: it replaces any existing value.
# Run from the project root:  bash scripts/push-env-vercel.sh
set -uo pipefail
cd "$(dirname "$0")/.."

VARS=(
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
  STRIPE_PRICE_BASIC
  STRIPE_PRICE_PRO
  STRIPE_WEBHOOK_SECRET
  NEXT_PUBLIC_APP_URL
)
ENVIRONMENTS=(production preview)

if [ ! -f .env.local ]; then
  echo "✗ No .env.local found in $(pwd)"; exit 1
fi

getval() {
  local line
  line=$(grep -m1 "^$1=" .env.local || true)
  line=${line#*=}
  line=${line%\"}; line=${line#\"}     # strip a surrounding double-quote, if any
  printf '%s' "$line"
}

for v in "${VARS[@]}"; do
  val=$(getval "$v")
  if [ -z "$val" ]; then
    echo "•  skip $v  (not set in .env.local)"
    continue
  fi
  for env in "${ENVIRONMENTS[@]}"; do
    vercel env rm "$v" "$env" -y >/dev/null 2>&1 || true
    if printf '%s' "$val" | vercel env add "$v" "$env" >/dev/null 2>&1; then
      echo "✓  $v  →  $env"
    else
      echo "✗  $v  →  $env  (failed)"
    fi
  done
done

echo ""
echo "Done. Now redeploy so the new vars take effect:  vercel --prod"

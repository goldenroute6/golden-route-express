#!/bin/zsh
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/get-shipment.sh TRACKING_CODE"
  exit 1
fi

TRACKING_CODE="$1"
SUPABASE_URL="${SUPABASE_URL:-https://nytgmlaiecrmrnymgclm.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-sb_publishable_iub4F08jEnUrOyplZPz1zQ_w_nSIs8m}"

curl -s "$SUPABASE_URL/rest/v1/shipments?tracking_number=eq.$TRACKING_CODE&select=tracking_number,payload" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

echo

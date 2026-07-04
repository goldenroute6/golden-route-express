#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHIPMENTS_FILE="$ROOT_DIR/data/shipments.json"
SUPABASE_URL="${SUPABASE_URL:-https://nytgmlaiecrmrnymgclm.supabase.co}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
  echo "Set it in terminal before running this script."
  exit 1
fi

if [[ ! -f "$SHIPMENTS_FILE" ]]; then
  echo "Missing shipments file: $SHIPMENTS_FILE"
  exit 1
fi

HTTP_STATUS=$(curl -s -o /tmp/gre_sync_response.json -w "%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/shipments" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  --data-binary "@$SHIPMENTS_FILE")

if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
  echo "Sync successful."
  cat /tmp/gre_sync_response.json
  exit 0
fi

echo "Sync failed with HTTP status: $HTTP_STATUS"
cat /tmp/gre_sync_response.json
exit 1

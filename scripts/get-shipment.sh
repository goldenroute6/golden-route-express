#!/bin/zsh
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/get-shipment.sh TRACKING_CODE"
  exit 1
fi

TRACKING_CODE="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHIPMENTS_FILE="$ROOT_DIR/data/shipments.json"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required for lookup."
  exit 1
fi

if [[ ! -f "$SHIPMENTS_FILE" ]]; then
  echo "Shipments file not found: $SHIPMENTS_FILE"
  exit 1
fi

python3 - "$SHIPMENTS_FILE" "$TRACKING_CODE" <<'PY'
import json
import sys

shipments_file = sys.argv[1]
tracking = str(sys.argv[2]).strip().upper()

if not tracking:
    print("Tracking code is required.", file=sys.stderr)
    sys.exit(1)

try:
    with open(shipments_file, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    print("Failed to read data/shipments.json", file=sys.stderr)
    sys.exit(1)

if not isinstance(data, list):
    print("data/shipments.json must be a JSON array.", file=sys.stderr)
    sys.exit(1)

matches = [
    row for row in data
    if str((row or {}).get("tracking_number", "")).strip().upper() == tracking
]

print(json.dumps(matches, indent=2))
PY

echo

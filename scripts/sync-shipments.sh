#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHIPMENTS_FILE="$ROOT_DIR/data/shipments.json"

if [[ ! -f "$SHIPMENTS_FILE" ]]; then
  echo "Missing shipments file: $SHIPMENTS_FILE"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required for validation."
  exit 1
fi

python3 - "$SHIPMENTS_FILE" <<'PY'
import json
import sys

shipments_file = sys.argv[1]

try:
    with open(shipments_file, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    print("Invalid JSON in data/shipments.json", file=sys.stderr)
    sys.exit(1)

if not isinstance(data, list):
    print("data/shipments.json must be a JSON array.", file=sys.stderr)
    sys.exit(1)

invalid = [
    row for row in data
    if not isinstance(row, dict) or not row.get("tracking_number") or not isinstance(row.get("payload"), dict)
]

if invalid:
    print(f"Validation failed: {len(invalid)} invalid record(s).", file=sys.stderr)
    sys.exit(1)

print(f"Validation successful: {len(data)} shipment record(s) ready.")
PY

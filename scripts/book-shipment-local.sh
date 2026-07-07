#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHIPMENTS_FILE="$ROOT_DIR/data/shipments.json"

gen_tracking() {
  local year rand
  year="$(date +%Y)"
  rand="$(printf '%04d' $((RANDOM % 9000 + 1000)))"
  echo "GRE-${year}-${rand}"
}

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required for local booking updates."
  exit 1
fi

echo "Local Booking (No Supabase)"
echo

read "tracking?Tracking number (leave empty to auto-generate): "
tracking="${tracking:-}"
if [[ -z "$tracking" ]]; then
  tracking="$(gen_tracking)"
fi
tracking="${tracking:u}"

read "sender_name?Sender full name: "
read "sender_city?Sender city: "
read "sender_country?Sender country: "
read "recipient_name?Recipient full name: "
read "recipient_city?Recipient city: "
read "recipient_country?Recipient country: "
read "cargo_description?Cargo description: "
read "cargo_weight?Cargo weight (kg): "
read "shipping_type?Shipping type (air/sea/standard): "

shipping_type="${shipping_type:l}"
if [[ "$shipping_type" != "air" && "$shipping_type" != "sea" && "$shipping_type" != "standard" ]]; then
  shipping_type="standard"
fi

case "$shipping_type" in
  air) shipping_label="Air Express" ;;
  sea) shipping_label="Sea Freight" ;;
  *) shipping_label="Standard" ;;
esac

created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
estimated_delivery="$(date -v+5d +%Y-%m-%d)"

python3 - "$SHIPMENTS_FILE" "$tracking" "$sender_name" "$sender_city" "$sender_country" "$recipient_name" "$recipient_city" "$recipient_country" "$cargo_description" "$cargo_weight" "$shipping_type" "$shipping_label" "$created_at" "$estimated_delivery" <<'PY'
import json
import os
import sys

(
    shipments_file,
    tracking,
    sender_name,
    sender_city,
    sender_country,
    recipient_name,
    recipient_city,
    recipient_country,
    cargo_description,
    cargo_weight,
    shipping_type,
    shipping_label,
    created_at,
    estimated_delivery,
) = sys.argv[1:]

from_location = f"{sender_city}, {sender_country}"
to_location = f"{recipient_city}, {recipient_country}"
transit_hub = f"{sender_city} Seaport Terminal" if shipping_type == "sea" else f"{sender_city} Air Cargo Hub"
destination_hub = f"{recipient_city} Port Logistics Hub" if shipping_type == "sea" else f"{recipient_city} Distribution Hub"

entry = {
    "tracking_number": tracking,
    "payload": {
        "trackingNumber": tracking,
        "status": "booked",
        "from": from_location,
        "to": to_location,
        "currentLocation": from_location,
        "estimatedDelivery": estimated_delivery,
        "weight": f"{cargo_weight} kg",
        "contents": cargo_description,
        "sender": sender_name,
        "recipient": recipient_name,
        "senderCity": sender_city,
        "senderCountry": sender_country,
        "recipientCity": recipient_city,
        "recipientCountry": recipient_country,
        "shippingType": shipping_label,
        "shippingTypeValue": shipping_type,
        "createdAt": created_at,
        "bookedAt": created_at,
        "daysElapsed": 0,
        "route": [
            {"day": 0, "status": "Shipment Booked", "location": from_location, "locationLabel": f"{sender_city} Pickup Point"},
            {"day": 2, "status": "Processed", "location": f"{sender_city} Processing Center", "locationLabel": f"{sender_city} Processing Center"},
            {"day": 3, "status": "In Transit", "location": transit_hub, "locationLabel": transit_hub},
            {"day": 4, "status": "Arrived at Destination Hub", "location": destination_hub, "locationLabel": destination_hub},
            {"day": 5, "status": "Out for Delivery", "location": to_location, "locationLabel": f"{recipient_city} Final Delivery Route"},
        ],
        "timeline": [
            {"status": "Shipment Booked", "location": from_location, "time": created_at}
        ],
    },
}

shipments = []
if os.path.exists(shipments_file):
    try:
        with open(shipments_file, "r", encoding="utf-8") as f:
            parsed = json.load(f)
            if isinstance(parsed, list):
                shipments = parsed
    except Exception:
        shipments = []

index = -1
for i, row in enumerate(shipments):
    code = str((row or {}).get("tracking_number", "")).upper()
    if code == tracking:
        index = i
        break

if index >= 0:
    shipments[index] = entry
else:
    shipments.append(entry)

with open(shipments_file, "w", encoding="utf-8") as f:
    json.dump(shipments, f, indent=2)
    f.write("\n")

print("Booking saved successfully (local file mode).")
print(f"Tracking number: {tracking}")
print(f"File: {shipments_file}")
PY

#!/bin/zsh
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://nytgmlaiecrmrnymgclm.supabase.co}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
  echo "Set it in terminal before running this script."
  exit 1
fi

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

gen_tracking() {
  local year rand
  year="$(date +%Y)"
  rand="$(printf '%04d' $((RANDOM % 9000 + 1000)))"
  echo "GRE-${year}-${rand}"
}

echo "Local Booking (MacBook only workflow)"
echo

read "tracking?Tracking number (leave empty to auto-generate): "
tracking="${tracking:-}"
if [[ -z "$tracking" ]]; then
  tracking="$(gen_tracking)"
fi

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
from_location="${sender_city}, ${sender_country}"
to_location="${recipient_city}, ${recipient_country}"

tracking_esc="$(json_escape "$tracking")"
from_esc="$(json_escape "$from_location")"
to_esc="$(json_escape "$to_location")"
sender_name_esc="$(json_escape "$sender_name")"
recipient_name_esc="$(json_escape "$recipient_name")"
sender_city_esc="$(json_escape "$sender_city")"
sender_country_esc="$(json_escape "$sender_country")"
recipient_city_esc="$(json_escape "$recipient_city")"
recipient_country_esc="$(json_escape "$recipient_country")"
cargo_description_esc="$(json_escape "$cargo_description")"
cargo_weight_esc="$(json_escape "$cargo_weight")"
shipping_label_esc="$(json_escape "$shipping_label")"
shipping_type_esc="$(json_escape "$shipping_type")"
created_at_esc="$(json_escape "$created_at")"
estimated_delivery_esc="$(json_escape "$estimated_delivery")"

payload_file="/tmp/gre_local_booking_payload.json"
cat > "$payload_file" <<JSON
[
  {
    "tracking_number": "${tracking_esc}",
    "payload": {
      "trackingNumber": "${tracking_esc}",
      "status": "booked",
      "from": "${from_esc}",
      "to": "${to_esc}",
      "currentLocation": "${from_esc}",
      "estimatedDelivery": "${estimated_delivery_esc}",
      "weight": "${cargo_weight_esc} kg",
      "contents": "${cargo_description_esc}",
      "sender": "${sender_name_esc}",
      "recipient": "${recipient_name_esc}",
      "senderCity": "${sender_city_esc}",
      "senderCountry": "${sender_country_esc}",
      "recipientCity": "${recipient_city_esc}",
      "recipientCountry": "${recipient_country_esc}",
      "shippingType": "${shipping_label_esc}",
      "shippingTypeValue": "${shipping_type_esc}",
      "createdAt": "${created_at_esc}",
      "bookedAt": "${created_at_esc}",
      "daysElapsed": 0,
      "route": [
        {"day": 0, "status": "Shipment Booked", "location": "${from_esc}", "locationLabel": "${sender_city_esc} Pickup Point"},
        {"day": 2, "status": "Processed", "location": "${sender_city_esc} Processing Center", "locationLabel": "${sender_city_esc} Processing Center"},
        {"day": 3, "status": "In Transit", "location": "${sender_city_esc} Transit Hub", "locationLabel": "${sender_city_esc} Transit Hub"},
        {"day": 4, "status": "Arrived at Destination Hub", "location": "${recipient_city_esc} Distribution Hub", "locationLabel": "${recipient_city_esc} Distribution Hub"},
        {"day": 5, "status": "Out for Delivery", "location": "${to_esc}", "locationLabel": "${recipient_city_esc} Final Delivery Route"}
      ],
      "timeline": [
        {"status": "Shipment Booked", "location": "${from_esc}", "time": "${created_at_esc}"}
      ]
    }
  }
]
JSON

http_status=$(curl -s -o /tmp/gre_local_booking_response.json -w "%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/shipments" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  --data-binary "@$payload_file")

if [[ "$http_status" == "200" || "$http_status" == "201" ]]; then
  echo
  echo "Booking saved successfully."
  echo "Tracking number: $tracking"
  exit 0
fi

echo
 echo "Booking failed with HTTP status: $http_status"
cat /tmp/gre_local_booking_response.json
exit 1

#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BOOK_SCRIPT="$ROOT_DIR/scripts/book-shipment-local.sh"
SYNC_SCRIPT="$ROOT_DIR/scripts/sync-shipments.sh"
GET_SCRIPT="$ROOT_DIR/scripts/get-shipment.sh"

print_header() {
  echo
  echo "==============================================="
  echo " Golden Route Express - VS Code Admin Console "
  echo "==============================================="
  echo "Root: $ROOT_DIR"
  echo
  echo "1) Book shipment"
  echo "2) Validate local shipments file"
  echo "3) Lookup tracking number"
  echo "0) Exit"
  echo
}

pause_console() {
  echo
  read "_pause?Press Enter to continue..."
}

ensure_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path"
    exit 1
  fi
}

ensure_file "$BOOK_SCRIPT"
ensure_file "$SYNC_SCRIPT"
ensure_file "$GET_SCRIPT"

while true; do
  print_header
  read "choice?Choose an option: "

  case "$choice" in
    1)
      echo
      echo "Starting shipment booking wizard..."
      zsh "$BOOK_SCRIPT"
      pause_console
      ;;
    2)
      echo
      echo "Validating data/shipments.json..."
      zsh "$SYNC_SCRIPT"
      pause_console
      ;;
    3)
      echo
      read "tracking_code?Enter tracking number: "
      tracking_code="${tracking_code:-}"

      if [[ -z "$tracking_code" ]]; then
        echo "Tracking number cannot be empty."
      else
        zsh "$GET_SCRIPT" "$tracking_code"
      fi

      pause_console
      ;;
    0)
      echo "Admin console closed."
      exit 0
      ;;
    *)
      echo "Invalid choice. Use 1, 2, 3, or 0."
      pause_console
      ;;
  esac
done

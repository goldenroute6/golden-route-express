# golden-route-express
A modern package tracking and shipping management system for logistics companies

🌐 **Live Site:** [https://goldenroute6.github.io/golden-route-express/](https://goldenroute6.github.io/golden-route-express/)

## Local data storage

This project is now local-file based and does not require Supabase.

All shipments are stored in:

- data/shipments.json

Public website users can only track packages.

Admin guide page:

- https://goldenroute6.github.io/golden-route-express/admin.html

## Manage bookings in VS Code

You can control booking and tracking codes directly from VS Code.

Files:

- data/shipments.json
- scripts/admin-console.sh
- scripts/sync-shipments.sh
- scripts/get-shipment.sh
- scripts/book-shipment-local.sh

Recommended admin command:

```bash
scripts/admin-console.sh
```

This opens a terminal menu to:

- Book shipment
- Validate local shipment file
- Lookup tracking number

## Booking workflow in VS Code

```bash
scripts/book-shipment-local.sh
```

Or run the full menu:

```bash
scripts/admin-console.sh
```

### Check one tracking code in VS Code

```bash
scripts/get-shipment.sh GRE-2026-9201
```

### Notes

- `data/shipments.json` must stay valid JSON array format.
- For static hosting, update `data/shipments.json` and redeploy so public tracking sees new records.

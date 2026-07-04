# golden-route-express
A modern package tracking and shipping management system for logistics companies

🌐 **Live Site:** [https://goldenroute6.github.io/golden-route-express/](https://goldenroute6.github.io/golden-route-express/)

## Cross-device tracking setup

This project now supports shared shipment storage through Supabase.

Without configuration, it falls back to browser local storage and only works on one device.

### 1. Create a Supabase project

- Create a new project in Supabase.
- In SQL editor, run:

```sql
create table if not exists public.shipments (
	tracking_number text primary key,
	payload jsonb not null,
	created_at timestamptz not null default now()
);

alter table public.shipments enable row level security;

create policy "Allow public read shipments"
on public.shipments
for select
to anon
using (true);

create policy "Allow public insert shipments"
on public.shipments
for insert
to anon
with check (true);

create policy "Allow public update shipments"
on public.shipments
for update
to anon
using (true)
with check (true);
```

### 2. Set project keys in index.html

In index.html, update:

- window.GRE_SUPABASE_URL
- window.GRE_SUPABASE_ANON_KEY

Example:

```html
<script>
	window.GRE_SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
	window.GRE_SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
</script>
```

### 3. Deploy to GitHub Pages

After deployment, every booked shipment can be tracked on any phone using the same tracking number.

## Admin booking (simple mode)

Public website users can only track packages. Booking is done manually in Supabase Table Editor.

Admin guide page:

- https://goldenroute6.github.io/golden-route-express/admin.html

### 1. Open Supabase table editor

- Project: nytgmlaiecrmrnymgclm
- Table: public.shipments
- Insert a row

### 2. Fill shipment fields

- tracking_number: unique code like GRE-2026-9001
- payload: full shipment JSON

Use `shipment-template.json` in this repository as your payload template.

### 3. Keep public tracking read-only

Run this SQL once:

```sql
alter table public.shipments enable row level security;

drop policy if exists "Public can read shipments" on public.shipments;
drop policy if exists "Allow public read shipments" on public.shipments;
drop policy if exists "Allow public insert shipments" on public.shipments;
drop policy if exists "Allow public update shipments" on public.shipments;
drop policy if exists "Allow public delete shipments" on public.shipments;
drop policy if exists "Admin can insert shipments" on public.shipments;
drop policy if exists "Admin can update shipments" on public.shipments;
drop policy if exists "Admin can delete shipments" on public.shipments;

create policy "Public can read shipments"
on public.shipments
for select
to anon
using (true);

revoke insert, update, delete on table public.shipments from anon;
grant select on table public.shipments to anon;
```

## Manage bookings in VS Code

You can control booking and tracking codes directly from VS Code.

Files:

- data/shipments.json
- scripts/sync-shipments.sh
- scripts/get-shipment.sh

### Booking workflow in VS Code

1. Open `data/shipments.json`
2. Add or edit shipment objects
3. Run sync command in VS Code terminal:

```bash
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
scripts/sync-shipments.sh
```

This upserts all shipments by `tracking_number`.

### Check one tracking code in VS Code

```bash
scripts/get-shipment.sh GRE-2026-9201
```

### Notes

- `SUPABASE_SERVICE_ROLE_KEY` is required for booking sync writes.
- Never commit your service role key into repository files.

## Secure booking password (server-side)

Public booking on the website now calls a Supabase RPC that validates password on the database side.

Run once in Supabase SQL Editor:

- sql/secure-booking.sql

Default booking password set by this script:

- Notorious3333

To change password later, run:

```sql
update public.booking_security
set password_hash = crypt('YOUR_NEW_PASSWORD', gen_salt('bf')),
	updated_at = now()
where id = 1;
```

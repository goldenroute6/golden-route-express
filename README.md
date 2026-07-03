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

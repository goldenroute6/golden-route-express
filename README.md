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

## Private admin booking

Public website users can only track packages. Booking is done from a private admin page.

Admin page URL:

- https://goldenroute6.github.io/golden-route-express/admin.html

### 1. Create your admin user in Supabase Auth

- Supabase dashboard -> Authentication -> Users -> Add user
- Create your login email and password

### 2. Set RLS so only your admin account can write

Replace `your-admin-email@example.com` below with your own admin email and run this SQL:

```sql
alter table public.shipments enable row level security;

drop policy if exists "Public can read shipments" on public.shipments;
drop policy if exists "Allow public read shipments" on public.shipments;
drop policy if exists "Allow public insert shipments" on public.shipments;
drop policy if exists "Allow public update shipments" on public.shipments;
drop policy if exists "Allow public delete shipments" on public.shipments;

create policy "Public can read shipments"
on public.shipments
for select
to anon
using (true);

create policy "Admin can insert shipments"
on public.shipments
for insert
to authenticated
with check (auth.jwt()->>'email' = 'your-admin-email@example.com');

create policy "Admin can update shipments"
on public.shipments
for update
to authenticated
using (auth.jwt()->>'email' = 'your-admin-email@example.com')
with check (auth.jwt()->>'email' = 'your-admin-email@example.com');

create policy "Admin can delete shipments"
on public.shipments
for delete
to authenticated
using (auth.jwt()->>'email' = 'your-admin-email@example.com');

revoke insert, update, delete on table public.shipments from anon;
grant select on table public.shipments to anon;
grant insert, update, delete on table public.shipments to authenticated;
```

### 3. Optional: lock admin page to one email in frontend

In admin.html set `window.GRE_ADMIN_EMAIL` to your admin email. This is a convenience check. Real protection is the SQL policy above.

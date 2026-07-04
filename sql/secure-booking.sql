create extension if not exists pgcrypto;

create table if not exists public.shipments (
  tracking_number text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.shipments enable row level security;

create table if not exists public.booking_security (
  id integer primary key check (id = 1),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.booking_security enable row level security;
revoke all on table public.booking_security from anon;
revoke all on table public.booking_security from authenticated;

insert into public.booking_security (id, password_hash, updated_at)
values (1, crypt('Notorious3333', gen_salt('bf')), now())
on conflict (id)
do update set
  password_hash = excluded.password_hash,
  updated_at = now();

drop policy if exists "Public can read shipments" on public.shipments;

create policy "Public can read shipments"
on public.shipments
for select
to anon
using (true);

revoke insert, update, delete on table public.shipments from anon;
revoke insert, update, delete on table public.shipments from authenticated;
grant select on table public.shipments to anon;

create or replace function public.book_shipment_secure(
  booking_password text,
  shipment_tracking_number text,
  shipment_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
  normalized_tracking text;
begin
  if booking_password is null or length(trim(booking_password)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Admin password is required.');
  end if;

  select password_hash into stored_hash
  from public.booking_security
  where id = 1;

  if stored_hash is null then
    return jsonb_build_object('ok', false, 'message', 'Booking password is not configured.');
  end if;

  if crypt(booking_password, stored_hash) <> stored_hash then
    return jsonb_build_object('ok', false, 'message', 'Incorrect admin password. Booking is restricted.');
  end if;

  normalized_tracking := upper(trim(coalesce(shipment_tracking_number, '')));

  if normalized_tracking = '' then
    return jsonb_build_object('ok', false, 'message', 'Tracking number is required.');
  end if;

  if shipment_payload is null then
    return jsonb_build_object('ok', false, 'message', 'Shipment payload is required.');
  end if;

  insert into public.shipments (tracking_number, payload)
  values (normalized_tracking, shipment_payload)
  on conflict (tracking_number)
  do update set payload = excluded.payload;

  return jsonb_build_object('ok', true, 'tracking_number', normalized_tracking);
end;
$$;

revoke all on function public.book_shipment_secure(text, text, jsonb) from public;
grant execute on function public.book_shipment_secure(text, text, jsonb) to anon;

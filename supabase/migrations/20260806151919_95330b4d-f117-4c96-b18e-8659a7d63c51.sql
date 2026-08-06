-- ===== ROLES =====
create type public.app_role as enum ('owner', 'customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create policy "read own roles" on public.user_roles
for select to authenticated using (auth.uid() = user_id);

create policy "insert own role" on public.user_roles
for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- assign role from signup metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.email, ''),
          new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id,
          case when coalesce(new.raw_user_meta_data->>'role','customer') = 'owner'
               then 'owner'::public.app_role else 'customer'::public.app_role end)
  on conflict (user_id, role) do nothing;

  return new;
end; $$;

-- ===== PARKING AREAS: pricing, hours, gps =====
alter table public.parking_areas
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists address text not null default '',
  add column if not exists opening_time time not null default '00:00',
  add column if not exists closing_time time not null default '23:59',
  add column if not exists vehicle_types text[] not null default array['car','bike','suv','truck'],
  add column if not exists price_bike numeric not null default 10,
  add column if not exists price_car numeric not null default 30,
  add column if not exists price_suv numeric not null default 40,
  add column if not exists price_truck numeric not null default 60,
  add column if not exists price_hourly numeric not null default 30,
  add column if not exists price_daily numeric not null default 250,
  add column if not exists rating numeric not null default 4.5,
  add column if not exists is_active boolean not null default true;

grant select on public.parking_areas to authenticated;
create policy "anyone signed in can browse areas" on public.parking_areas
for select to authenticated using (true);

-- ===== SLOTS =====
alter table public.parking_slots
  add column if not exists vehicle_type text not null default 'car';

create policy "anyone signed in can browse slots" on public.parking_slots
for select to authenticated using (true);

-- ===== BOOKINGS =====
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  customer_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.parking_areas(id) on delete cascade,
  slot_id uuid references public.parking_slots(id) on delete set null,
  vehicle_type text not null default 'car',
  vehicle_number text not null default '',
  start_time timestamptz not null,
  end_time timestamptz not null,
  hours numeric not null default 1,
  amount numeric not null default 0,
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

create policy "customers manage own bookings" on public.bookings
for all to authenticated using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

create policy "owners view area bookings" on public.bookings
for select to authenticated using (
  exists (select 1 from public.parking_areas a where a.id = bookings.area_id and a.user_id = auth.uid())
);

create policy "owners update area bookings" on public.bookings
for update to authenticated using (
  exists (select 1 from public.parking_areas a where a.id = bookings.area_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from public.parking_areas a where a.id = bookings.area_id and a.user_id = auth.uid())
);

create trigger t_bookings_updated before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.validate_booking_window()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.end_time <= new.start_time then
    raise exception 'Booking end time must be after start time';
  end if;
  return new;
end; $$;

create trigger t_bookings_window before insert or update on public.bookings
for each row execute function public.validate_booking_window();

-- ===== PAYMENTS =====
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.parking_areas(id) on delete cascade,
  amount numeric not null default 0,
  currency text not null default 'INR',
  method text not null default 'upi',
  status text not null default 'pending',
  transaction_ref text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  receipt_no text not null default 'RCPT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;

create policy "customers manage own payments" on public.payments
for all to authenticated using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

create policy "owners view area payments" on public.payments
for select to authenticated using (
  exists (select 1 from public.parking_areas a where a.id = payments.area_id and a.user_id = auth.uid())
);

-- ===== FAVOURITES =====
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.parking_areas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, area_id)
);

grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;

create policy "own favorites" on public.favorites
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== VEHICLE DETECTIONS =====
create table public.vehicle_detections (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.parking_areas(id) on delete cascade,
  session_id uuid references public.camera_sessions(id) on delete set null,
  slot_id uuid references public.parking_slots(id) on delete set null,
  vehicle_class text not null default 'car',
  confidence numeric not null default 0,
  bbox jsonb not null default '{}'::jsonb,
  is_simulated boolean not null default true,
  detected_at timestamptz not null default now()
);

grant select, insert, delete on public.vehicle_detections to authenticated;
grant all on public.vehicle_detections to service_role;
alter table public.vehicle_detections enable row level security;

create policy "owners manage detections" on public.vehicle_detections
for all to authenticated using (
  exists (select 1 from public.parking_areas a where a.id = vehicle_detections.area_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from public.parking_areas a where a.id = vehicle_detections.area_id and a.user_id = auth.uid())
);

-- ===== NOTIFICATIONS =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "own notifications" on public.notifications
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_bookings_area on public.bookings(area_id);
create index if not exists idx_bookings_customer on public.bookings(customer_id);
create index if not exists idx_payments_area on public.payments(area_id);
create index if not exists idx_detections_area on public.vehicle_detections(area_id);
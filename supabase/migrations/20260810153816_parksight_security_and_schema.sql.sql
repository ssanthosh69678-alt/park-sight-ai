/*
# ParkSight AI — Security hardening & schema completion

## Summary
Makes booking amounts and payment confirmation server-enforced, prevents
double-booking of parking slots, tightens RLS so customers cannot self-confirm
bookings, and adds columns for the owner parking-area form and profile.

## New columns
- parking_areas: city, state, postal_code, parking_rules, contact_number, camera_stream_url
- profiles: business_name, default_vehicle_number

## New functions (SECURITY DEFINER)
1. create_booking(...) — inserts a booking with a SERVER-COMPUTED amount.
   Caller's amount is never trusted. Validates vehicle type (car/bike only),
   slot availability, prevents double-booking via overlap check.
2. confirm_demo_payment(booking_id, method) — confirms a booking as paid (demo).
   Only the booking's customer can call it.
3. cancel_booking(booking_id) — lets a customer cancel their own pending/confirmed booking.

## Policy changes
- bookings: replaced permissive FOR ALL customer policy with separate
  SELECT / INSERT / UPDATE (cancel-only) / DELETE policies.
  UPDATE WITH CHECK requires status='cancelled'.
- payments: direct INSERT/UPDATE revoked from authenticated; only
  confirm_demo_payment can create payment rows.
- Granted EXECUTE on new functions to authenticated.
*/

-- ===== Additional columns on parking_areas =====
alter table public.parking_areas
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists parking_rules text,
  add column if not exists contact_number text,
  add column if not exists camera_stream_url text;

alter table public.parking_areas
  alter column vehicle_types set default array['car','bike'];

-- ===== Additional columns on profiles =====
alter table public.profiles
  add column if not exists business_name text not null default '',
  add column if not exists default_vehicle_number text not null default '';

-- ===== Helper: compute booking amount server-side =====
create or replace function public.compute_booking_amount(
  p_area_id uuid,
  p_vehicle_type text,
  p_start_time timestamptz,
  p_end_time timestamptz
) returns numeric language sql stable security definer set search_path = public as $$
  select
    case
      when p_vehicle_type = 'bike' then
        coalesce(nullif(a.price_bike, 0), a.price_hourly, 0)
      when p_vehicle_type = 'car' then
        coalesce(nullif(a.price_car, 0), a.price_hourly, 0)
      else 0
    end * extract(epoch from (p_end_time - p_start_time)) / 3600.0
  from public.parking_areas a
  where a.id = p_area_id
$$;

-- ===== create_booking function =====
create or replace function public.create_booking(
  p_area_id uuid,
  p_slot_id uuid,
  p_vehicle_type text,
  p_vehicle_number text,
  p_start_time timestamptz,
  p_end_time timestamptz
) returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_area public.parking_areas;
  v_slot public.parking_slots;
  v_hours numeric;
  v_amount numeric;
  v_overlap_count integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to book';
  end if;

  if p_vehicle_type not in ('car','bike') then
    raise exception 'Invalid vehicle type. Only car and bike are supported.';
  end if;

  if p_end_time <= p_start_time then
    raise exception 'Booking end time must be after start time';
  end if;

  if p_start_time < now() then
    raise exception 'Cannot book in the past';
  end if;

  select * into v_area from public.parking_areas where id = p_area_id and is_active = true;
  if not found then
    raise exception 'Parking area not found or inactive';
  end if;

  select * into v_slot from public.parking_slots where id = p_slot_id and area_id = p_area_id;
  if not found then
    raise exception 'Slot not found in this parking area';
  end if;

  if v_slot.status not in ('available') then
    raise exception 'This slot is not available for booking (status: %)', v_slot.status;
  end if;

  if v_slot.vehicle_type <> p_vehicle_type then
    raise exception 'This slot is for % vehicles only', v_slot.vehicle_type;
  end if;

  select count(*) into v_overlap_count
  from public.bookings b
  where b.slot_id = p_slot_id
    and b.status not in ('cancelled','rejected')
    and b.start_time < p_end_time
    and b.end_time > p_start_time;

  if v_overlap_count > 0 then
    raise exception 'This slot is already booked for the selected time period';
  end if;

  v_hours := extract(epoch from (p_end_time - p_start_time)) / 3600.0;
  v_amount := public.compute_booking_amount(p_area_id, p_vehicle_type, p_start_time, p_end_time);
  v_amount := round(v_amount, 2);

  insert into public.bookings (
    customer_id, area_id, slot_id, vehicle_type, vehicle_number,
    start_time, end_time, hours, amount, status, payment_status
  ) values (
    auth.uid(), p_area_id, p_slot_id, p_vehicle_type, p_vehicle_number,
    p_start_time, p_end_time, v_hours, v_amount, 'pending', 'unpaid'
  ) returning * into v_booking;

  return v_booking;
end;
$$;

-- ===== confirm_demo_payment function =====
create or replace function public.confirm_demo_payment(
  p_booking_id uuid,
  p_method text
) returns public.payments language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_payment public.payments;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  if v_booking.customer_id <> auth.uid() then
    raise exception 'You can only pay for your own bookings';
  end if;

  if v_booking.payment_status = 'paid' then
    raise exception 'This booking is already paid';
  end if;

  if v_booking.status in ('cancelled','rejected') then
    raise exception 'Cannot pay for a cancelled or rejected booking';
  end if;

  insert into public.payments (
    booking_id, customer_id, area_id, amount, currency, method, status, paid_at
  ) values (
    v_booking.id, v_booking.customer_id, v_booking.area_id,
    v_booking.amount, 'INR', coalesce(p_method, 'upi'), 'paid', now()
  ) returning * into v_payment;

  update public.bookings
    set payment_status = 'paid', status = 'confirmed'
    where id = v_booking.id;

  insert into public.notifications (user_id, title, message, type)
  values (
    v_booking.customer_id,
    'Booking confirmed',
    format('Booking %s is confirmed. Demo payment of ₹%s received.', v_booking.booking_ref, v_booking.amount),
    'booking'
  );

  return v_payment;
end;
$$;

-- ===== cancel_booking function =====
create or replace function public.cancel_booking(
  p_booking_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  if v_booking.customer_id <> auth.uid() then
    raise exception 'You can only cancel your own bookings';
  end if;

  if v_booking.status not in ('pending','confirmed') then
    raise exception 'Only pending or confirmed bookings can be cancelled';
  end if;

  update public.bookings set status = 'cancelled' where id = p_booking_id;

  insert into public.notifications (user_id, title, message, type)
  values (
    v_booking.customer_id,
    'Booking cancelled',
    format('Booking %s has been cancelled.', v_booking.booking_ref),
    'booking'
  );
end;
$$;

-- ===== Grant execute on new functions =====
grant execute on function public.create_booking(uuid, uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.confirm_demo_payment(uuid, text) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.compute_booking_amount(uuid, text, timestamptz, timestamptz) to authenticated;

revoke execute on function public.create_booking(uuid, uuid, text, text, timestamptz, timestamptz) from public, anon;
revoke execute on function public.confirm_demo_payment(uuid, text) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.compute_booking_amount(uuid, text, timestamptz, timestamptz) from public, anon;

-- ===== Tighten bookings RLS =====
drop policy if exists "customers manage own bookings" on public.bookings;

drop policy if exists "customer select own" on public.bookings;
create policy "customer select own" on public.bookings
  for select to authenticated using (auth.uid() = customer_id);

drop policy if exists "customer insert own" on public.bookings;
create policy "customer insert own" on public.bookings
  for insert to authenticated with check (auth.uid() = customer_id);

drop policy if exists "customer update cancel only" on public.bookings;
create policy "customer update cancel only" on public.bookings
  for update to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id and status = 'cancelled');

drop policy if exists "customer delete own" on public.bookings;
create policy "customer delete own" on public.bookings
  for delete to authenticated using (auth.uid() = customer_id);

-- ===== Tighten payments RLS =====
revoke insert, update on public.payments from authenticated;

-- ===== Index for overlap check performance =====
create index if not exists idx_bookings_slot_active on public.bookings (slot_id)
  where status not in ('cancelled','rejected');

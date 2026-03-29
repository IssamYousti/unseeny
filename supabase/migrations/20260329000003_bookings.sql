-- bookings: stores date-based reservation requests from guests
-- Status flow: pending → confirmed | rejected | cancelled

create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings on delete cascade,
  guest_id uuid not null references auth.users on delete cascade,
  host_id uuid not null references auth.users on delete cascade,
  conversation_id uuid references public.conversations on delete set null,
  check_in date not null,
  check_out date not null,
  guests_count int not null default 1,
  total_price numeric(10, 2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  created_at timestamptz default now(),
  constraint check_dates check (check_out > check_in)
);

alter table public.bookings enable row level security;

-- Participants can view their own bookings
drop policy if exists "Participants can view bookings" on public.bookings;
create policy "Participants can view bookings"
on public.bookings for select
using (guest_id = auth.uid() or host_id = auth.uid());

-- Guests can create bookings for approved listings
drop policy if exists "Guest can create booking" on public.bookings;
create policy "Guest can create booking"
on public.bookings for insert
with check (
  guest_id = auth.uid()
  and exists (
    select 1 from public.listings
    where id = listing_id and is_approved = true
  )
);

-- Hosts can update status of bookings for their listings
drop policy if exists "Host can update booking status" on public.bookings;
create policy "Host can update booking status"
on public.bookings for update
using (host_id = auth.uid())
with check (host_id = auth.uid());

-- Guests can cancel their own pending/confirmed bookings
drop policy if exists "Guest can cancel own booking" on public.bookings;
create policy "Guest can cancel own booking"
on public.bookings for update
using (guest_id = auth.uid() and status in ('pending', 'confirmed'))
with check (guest_id = auth.uid() and status = 'cancelled');

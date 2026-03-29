-- blocked_periods: hosts mark date ranges as unavailable on their listings.
-- Used alongside bookings to determine availability.

create table if not exists public.blocked_periods (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings on delete cascade,
  host_id uuid not null references auth.users on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now(),
  check (end_date >= start_date)
);

alter table public.blocked_periods enable row level security;

-- Public read (needed for availability checking on listing pages)
drop policy if exists "Public can read blocked periods" on public.blocked_periods;
create policy "Public can read blocked periods"
on public.blocked_periods for select
using (true);

-- Host can insert blocked periods for their own listings
drop policy if exists "Host can insert blocked period" on public.blocked_periods;
create policy "Host can insert blocked period"
on public.blocked_periods for insert
with check (host_id = auth.uid());

-- Host can delete their own blocked periods
drop policy if exists "Host can delete blocked period" on public.blocked_periods;
create policy "Host can delete blocked period"
on public.blocked_periods for delete
using (host_id = auth.uid());

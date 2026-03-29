-- guest_reviews: hosts rate guests after a confirmed, completed stay.
-- Builds a guest reputation that future hosts can see before approving a booking.

create table if not exists public.guest_reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid not null references public.bookings on delete cascade,
  host_id uuid not null references auth.users on delete cascade,
  guest_id uuid not null references auth.users on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(booking_id)
);

alter table public.guest_reviews enable row level security;

-- Hosts can insert a review for their own bookings
drop policy if exists "Host can review guest" on public.guest_reviews;
create policy "Host can review guest"
on public.guest_reviews for insert
with check (host_id = auth.uid());

-- Host can update their own guest review
drop policy if exists "Host can update guest review" on public.guest_reviews;
create policy "Host can update guest review"
on public.guest_reviews for update
using (host_id = auth.uid())
with check (host_id = auth.uid());

-- Authenticated users can read guest reviews (hosts need to see guest reputation)
drop policy if exists "Authenticated can read guest reviews" on public.guest_reviews;
create policy "Authenticated can read guest reviews"
on public.guest_reviews for select
using (auth.uid() is not null);

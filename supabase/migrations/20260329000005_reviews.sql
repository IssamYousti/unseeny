-- reviews: guests leave a rating + comment after a confirmed, completed stay
-- One review per booking (enforced by unique constraint on booking_id).

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings on delete cascade,
  booking_id uuid not null references public.bookings on delete cascade,
  reviewer_id uuid not null references auth.users on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(booking_id)
);

alter table public.reviews enable row level security;

-- Anyone can read reviews for approved listings
drop policy if exists "Public can read reviews" on public.reviews;
create policy "Public can read reviews"
on public.reviews for select
using (
  exists (
    select 1 from public.listings
    where id = listing_id and is_approved = true
  )
);

-- Reviewer can insert their own review
drop policy if exists "Guest can submit review" on public.reviews;
create policy "Guest can submit review"
on public.reviews for insert
with check (reviewer_id = auth.uid());

-- Reviewer can update their own review
drop policy if exists "Guest can update own review" on public.reviews;
create policy "Guest can update own review"
on public.reviews for update
using (reviewer_id = auth.uid())
with check (reviewer_id = auth.uid());

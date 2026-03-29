--------------------------------------------------
-- LISTINGS TABLE
--------------------------------------------------
create table public.listings (
  id uuid default gen_random_uuid() primary key,

  host_id uuid references auth.users not null,

  title text not null,
  descr text,

  street text not null,
  house_number text not null,
  house_number_addition text,
  zip_code text not null,
  city text not null,
  country text not null,

  is_approved boolean default false,

  max_guests int,
  bedrooms int,
  bathrooms int,

  price_per_night numeric not null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.listings enable row level security;
create policy "Anyone can read listings"
on public.listings
for select
using (true);



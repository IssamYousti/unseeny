--------------------------------------------------
-- 1) CREATE TABLE
--------------------------------------------------
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  first_name text,
  last_name text,
  dob date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

--------------------------------------------------
-- 2) ENABLE RLS
--------------------------------------------------
alter table public.profiles enable row level security;

--------------------------------------------------
-- 3) POLICIES
--------------------------------------------------

-- POLICY 1: Users can read their OWN profile
create policy "Users can read their own profile"
on public.profiles
for select
using (auth.uid() = id);

-- POLICY 2: Users can insert their OWN profile
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- POLICY 3: Users can update their OWN profile
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- POLICY 4: Anyone can read basic profile info
create policy "Anyone can read basic profile info"
on public.profiles
for select
using (true);

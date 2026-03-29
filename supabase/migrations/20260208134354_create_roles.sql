--------------------------------------------------
-- ROLES TABLE
--------------------------------------------------
create table public.roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  is_admin boolean default false,
  is_approved_host boolean default false,
  is_approved_guest boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

--------------------------------------------------
-- ENABLE RLS  (on the RIGHT table)
--------------------------------------------------
alter table public.roles enable row level security;

--------------------------------------------------
-- POLICIES
--------------------------------------------------

-- Users can read their own roles
create policy "Users can read own roles"
on public.roles
for select
using (auth.uid() = user_id);

-- (Optional) Admin policy can be added later

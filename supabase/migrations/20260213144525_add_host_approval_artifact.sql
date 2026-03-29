create table public.host_applications (
  id uuid default gen_random_uuid() primary key,

  user_id uuid references auth.users not null unique,

  full_name text not null,
  phone text not null,
  country text not null,

  property_description text not null,
  privacy_guarantee text not null,

  status text default 'pending'
    check (status in ('pending','approved','rejected')),

  admin_notes text,

  created_at timestamptz default now(),
  reviewed_at timestamptz
);

alter table host_applications enable row level security;

-- user creates application
create policy "Users can apply"
on host_applications
for insert
with check (auth.uid() = user_id);

-- user reads own application
create policy "Users read own application"
on host_applications
for select
using (auth.uid() = user_id);

-- admins read all
create policy "Admins read all applications"
on host_applications
for select
using (
  exists (
    select 1 from roles
    where roles.user_id = auth.uid()
    and roles.is_admin = true
  )
);

-- admins update decision
create policy "Admins review applications"
on host_applications
for update
using (
  exists (
    select 1 from roles
    where roles.user_id = auth.uid()
    and roles.is_admin = true
  )
);

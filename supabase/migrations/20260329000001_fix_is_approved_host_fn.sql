-- The live roles table has column is_approved_owner (not is_approved_host
-- as the create_roles migration suggests). This migration:
-- 1. Renames the column to is_approved_host for consistency
-- 2. Recreates the is_approved_host() function using the correct column
-- 3. Recreates the listing policies that depend on the function

-- Step 1: rename the column
alter table public.roles
  rename column is_approved_owner to is_approved_host;

-- Step 2: drop the function + its dependent policies in one go
drop function if exists public.is_approved_host() cascade;

-- Step 3: recreate the function with the correct column name
create or replace function public.is_approved_host()
returns boolean as $$
  select exists (
    select 1
    from public.roles
    where user_id = auth.uid()
    and is_approved_host = true
  );
$$ language sql security definer;

-- Step 4: recreate the listing policies
create policy "Only approved hosts can create listings"
on public.listings for insert
with check (
  host_id = auth.uid()
  and public.is_approved_host()
);

create policy "Approved host can update own listings"
on public.listings for update
using (host_id = auth.uid() and public.is_approved_host())
with check (host_id = auth.uid() and public.is_approved_host());

create policy "Approved host can delete own listings"
on public.listings for delete
using (host_id = auth.uid() and public.is_approved_host());

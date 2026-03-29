create or replace function public.is_approved_host()
returns boolean as $$
  select exists (
    select 1
    from public.roles
    where user_id = auth.uid()
    and is_approved_owner = true
  );
$$ language sql security definer;

alter table public.listings enable row level security;

--------------------------------------------------
-- CREATE: only approved hosts, and they must be host_id
--------------------------------------------------
create policy "Only approved hosts can create listings"
on public.listings
for insert
with check (
  host_id = auth.uid()
  and public.is_approved_host()
);

--------------------------------------------------
-- UPDATE: only approved owner of that listing
--------------------------------------------------
create policy "Approved host can update own listings"
on public.listings
for update
using (
  host_id = auth.uid()
  and public.is_approved_host()
)
with check (
  host_id = auth.uid()
  and public.is_approved_host()
);

--------------------------------------------------
-- DELETE: only approved owner of that listing
--------------------------------------------------
create policy "Approved host can delete own listings"
on public.listings
for delete
using (
  host_id = auth.uid()
  and public.is_approved_host()
);

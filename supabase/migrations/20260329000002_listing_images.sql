-- listing_images: stores uploaded photos per listing (position-ordered)
-- Uses create table if not exists + drop policy if exists for safe re-runs.

create table if not exists public.listing_images (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings on delete cascade,
  storage_path text not null,
  position int default 0,
  created_at timestamptz default now()
);

alter table public.listing_images enable row level security;

drop policy if exists "Public can view approved listing images" on public.listing_images;
drop policy if exists "Host can view own listing images" on public.listing_images;
drop policy if exists "Host can insert listing images" on public.listing_images;
drop policy if exists "Host can delete own listing images" on public.listing_images;

create policy "Public can view approved listing images"
on public.listing_images for select
using (
  exists (
    select 1 from public.listings
    where id = listing_id and is_approved = true
  )
);

create policy "Host can view own listing images"
on public.listing_images for select
using (
  exists (
    select 1 from public.listings
    where id = listing_id and host_id = auth.uid()
  )
);

create policy "Host can insert listing images"
on public.listing_images for insert
with check (
  exists (
    select 1 from public.listings
    where id = listing_id and host_id = auth.uid()
  )
);

create policy "Host can delete own listing images"
on public.listing_images for delete
using (
  exists (
    select 1 from public.listings
    where id = listing_id and host_id = auth.uid()
  )
);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Storage policies (drop first for idempotency)
drop policy if exists "Public can read listing images" on storage.objects;
drop policy if exists "Authenticated users can upload listing images" on storage.objects;
drop policy if exists "Users can delete own listing images" on storage.objects;

create policy "Public can read listing images"
on storage.objects for select
using (bucket_id = 'listing-images');

create policy "Authenticated users can upload listing images"
on storage.objects for insert
with check (
  bucket_id = 'listing-images'
  and auth.uid() is not null
  and auth.uid()::text = (string_to_array(name, '/'))[1]
);

create policy "Users can delete own listing images"
on storage.objects for delete
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (string_to_array(name, '/'))[1]
);

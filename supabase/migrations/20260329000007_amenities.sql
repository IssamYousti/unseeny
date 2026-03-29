-- Add amenities array to listings.
-- Stored as text[] so no join needed; values are predefined keys like "private_pool", "wifi", etc.

alter table public.listings
  add column if not exists amenities text[] not null default '{}';

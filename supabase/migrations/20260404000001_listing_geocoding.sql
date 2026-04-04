-- Add geocoded lat/lon to listings for future proximity search
alter table listings
  add column if not exists latitude  float8,
  add column if not exists longitude float8;

-- Host-specific profile fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS languages   text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS host_bio    text,
  ADD COLUMN IF NOT EXISTS hosting_since date;

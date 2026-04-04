-- Hosts can archive listings to hide them without deleting.
-- Archived listings are excluded from the public browse page.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Archived listings should not appear in public searches
-- (the existing RLS / query layer filters by is_approved; archive is an additional host-side toggle)

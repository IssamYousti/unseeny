-- Add timezone column to listings
-- Auto-populated from coordinates when listing is created/updated
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS timezone text;

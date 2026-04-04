-- Extend listing_notifications with per-subscriber filter preferences.
-- Empty arrays = "any" (no restriction). null price/guests = no restriction.

ALTER TABLE listing_notifications
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS countries  text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cities     text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_price  numeric,
  ADD COLUMN IF NOT EXISTS min_guests int,
  ADD COLUMN IF NOT EXISTS amenities  text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true;

-- One preference row per authenticated user
CREATE UNIQUE INDEX IF NOT EXISTS listing_notifications_user_id_key
  ON listing_notifications (user_id)
  WHERE user_id IS NOT NULL;

-- RLS: authenticated users can manage their own row
ALTER TABLE listing_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert) — existing behaviour kept
CREATE POLICY "anyone can subscribe"
  ON listing_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read + update their own row
CREATE POLICY "users read own preferences"
  ON listing_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users update own preferences"
  ON listing_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users delete own preferences"
  ON listing_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

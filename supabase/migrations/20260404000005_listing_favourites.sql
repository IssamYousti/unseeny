CREATE TABLE listing_favourites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  listing_id  uuid REFERENCES listings(id)    ON DELETE CASCADE NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE listing_favourites ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own favourites
CREATE POLICY "Users manage own favourites" ON listing_favourites
  FOR ALL USING (auth.uid() = user_id);

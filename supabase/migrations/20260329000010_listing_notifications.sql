-- Listing notification subscriptions
CREATE TABLE IF NOT EXISTS public.listing_notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_notifications_email_key UNIQUE (email)
);

ALTER TABLE public.listing_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone (including authenticated users) can subscribe
CREATE POLICY "Anyone can insert notification subscription"
  ON public.listing_notifications
  FOR INSERT
  WITH CHECK (true);

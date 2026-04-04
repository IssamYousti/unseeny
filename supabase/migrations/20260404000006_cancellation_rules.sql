-- ─────────────────────────────────────────────────────────────────────────────
-- Listing cancellation policy (one row per listing, upsert pattern)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE listing_cancellation_policy (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                  uuid UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  policy_type                 text NOT NULL DEFAULT 'moderate'
    CHECK (policy_type IN ('flexible','moderate','strict','custom')),
  -- "full refund if cancelled ≥ N days before check-in before cutoff_hour"
  full_refund_days_before      int  NOT NULL DEFAULT 5,
  -- "partial refund if cancelled ≥ N days before check-in before cutoff_hour"
  partial_refund_days_before   int  NOT NULL DEFAULT 1,
  -- percentage of total_price refunded in the partial window
  partial_refund_percentage    int  NOT NULL DEFAULT 50,
  -- local hour (0-23) at which the daily cutoff applies (default 18 = 6 PM)
  cutoff_hour                  int  NOT NULL DEFAULT 18,
  -- IANA timezone of the listing (for accurate cutoff calculation)
  timezone                     text NOT NULL DEFAULT 'UTC',
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now()
);

ALTER TABLE listing_cancellation_policy ENABLE ROW LEVEL SECURITY;

-- Hosts read/write their own policy; guests can read policy for approved listings
CREATE POLICY "Host manages own cancellation policy" ON listing_cancellation_policy
  FOR ALL
  USING (
    listing_id IN (SELECT id FROM listings WHERE host_id = auth.uid())
  );

CREATE POLICY "Anyone can read cancellation policy" ON listing_cancellation_policy
  FOR SELECT
  USING (
    listing_id IN (SELECT id FROM listings WHERE is_approved = true)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Listing property rules (one row per listing)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE listing_rules (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id               uuid UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  check_in_from            time NOT NULL DEFAULT '15:00',
  check_in_until           time NOT NULL DEFAULT '22:00',
  checkout_before          time NOT NULL DEFAULT '11:00',
  -- 'lockbox' | 'doorman' | 'keypad' | 'smart_lock' | 'host'
  self_checkin_method      text NOT NULL DEFAULT 'host',
  pets_allowed             boolean NOT NULL DEFAULT false,
  smoking_allowed          boolean NOT NULL DEFAULT false,
  parties_allowed          boolean NOT NULL DEFAULT false,
  quiet_hours_start        time    DEFAULT '22:00',
  quiet_hours_end          time    DEFAULT '09:00',
  commercial_photography   boolean NOT NULL DEFAULT false,
  additional_rules         text,           -- freeform text, host-defined
  return_keys              boolean NOT NULL DEFAULT true,
  lock_up                  boolean NOT NULL DEFAULT true,
  turn_things_off          boolean NOT NULL DEFAULT true,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

ALTER TABLE listing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host manages own rules" ON listing_rules
  FOR ALL
  USING (
    listing_id IN (SELECT id FROM listings WHERE host_id = auth.uid())
  );

CREATE POLICY "Anyone can read rules" ON listing_rules
  FOR SELECT
  USING (
    listing_id IN (SELECT id FROM listings WHERE is_approved = true)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend bookings with refund tracking
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_session_id  text,
  ADD COLUMN IF NOT EXISTS refund_amount      numeric(10,2),
  ADD COLUMN IF NOT EXISTS refunded_at        timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by       text;   -- 'guest' | 'host' | 'admin'

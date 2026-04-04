-- ─────────────────────────────────────────────────────────────────────────────
-- Platform fee configuration (single-row table, admin-editable)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_config (
  id                text PRIMARY KEY DEFAULT 'default',
  host_fee_pct      numeric NOT NULL DEFAULT 0.02,   -- 2%  deducted from host
  guest_markup_pct  numeric NOT NULL DEFAULT 0.10,   -- 10% added on top for guest
  updated_at        timestamptz DEFAULT now()
);

-- Seed the default row
INSERT INTO platform_config (id, host_fee_pct, guest_markup_pct)
VALUES ('default', 0.02, 0.10)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform config" ON platform_config
  FOR SELECT USING (true);

CREATE POLICY "Admin manages platform config" ON platform_config
  FOR ALL
  USING (EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND is_admin = true));

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend listings with pricing metadata
-- ─────────────────────────────────────────────────────────────────────────────

-- price_type: whether the host entered what guests pay or what they earn
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS price_type text DEFAULT 'guest_pays'
    CHECK (price_type IN ('host_earns', 'guest_pays')),
  ADD COLUMN IF NOT EXISTS host_payout_per_night numeric,
  ADD COLUMN IF NOT EXISTS is_rejected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Terms & Conditions sections (admin-managed)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS terms_sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  content    text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE terms_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read terms" ON terms_sections
  FOR SELECT USING (true);

CREATE POLICY "Admin manages terms" ON terms_sections
  FOR ALL
  USING (EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND is_admin = true));

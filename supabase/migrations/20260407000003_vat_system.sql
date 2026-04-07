-- ─────────────────────────────────────────────────────────────────────────────
-- VAT rates per country (admin-managed, used for future OSS multi-country)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vat_rates (
  country_code  char(2) PRIMARY KEY,
  standard_rate numeric NOT NULL,
  effective_from date NOT NULL DEFAULT now()
);

ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vat_rates"  ON vat_rates FOR SELECT USING (true);
CREATE POLICY "Admin manages vat_rates"    ON vat_rates FOR ALL
  USING (EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND is_admin = true));

INSERT INTO vat_rates (country_code, standard_rate) VALUES
  ('BE', 0.21), ('NL', 0.21), ('DE', 0.19), ('FR', 0.20),
  ('ES', 0.21), ('IT', 0.22), ('PT', 0.23), ('AT', 0.20),
  ('PL', 0.23), ('SE', 0.25), ('DK', 0.25), ('FI', 0.24),
  ('IE', 0.23), ('LU', 0.17), ('CZ', 0.21), ('HU', 0.27),
  ('RO', 0.19), ('BG', 0.20), ('HR', 0.25), ('SK', 0.20),
  ('SI', 0.22), ('EE', 0.22), ('LV', 0.21), ('LT', 0.21),
  ('GR', 0.24), ('CY', 0.19), ('MT', 0.18)
ON CONFLICT (country_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Platform config — add VAT rate (Belgian 21% as default until OSS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS vat_pct numeric NOT NULL DEFAULT 0.21;

UPDATE platform_config SET vat_pct = 0.21 WHERE id = 'default';

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles — host/guest VAT & billing fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_business       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_number        text,
  ADD COLUMN IF NOT EXISTS vat_validated     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_country   char(2);

-- ─────────────────────────────────────────────────────────────────────────────
-- Bookings — store VAT snapshot at time of booking (never recalculate)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS accommodation_excl_vat      numeric,
  ADD COLUMN IF NOT EXISTS guest_fee_excl_vat          numeric,
  ADD COLUMN IF NOT EXISTS guest_fee_vat_rate          numeric,
  ADD COLUMN IF NOT EXISTS guest_fee_vat_amount        numeric,
  ADD COLUMN IF NOT EXISTS guest_vat_treatment         text
    CHECK (guest_vat_treatment IN ('standard', 'reverse_charge')),
  ADD COLUMN IF NOT EXISTS host_commission_excl        numeric,
  ADD COLUMN IF NOT EXISTS host_commission_vat_rate    numeric,
  ADD COLUMN IF NOT EXISTS host_commission_vat_amount  numeric,
  ADD COLUMN IF NOT EXISTS host_vat_treatment          text
    CHECK (host_vat_treatment IN ('standard', 'reverse_charge')),
  ADD COLUMN IF NOT EXISTS guest_stripe_total          numeric,
  ADD COLUMN IF NOT EXISTS host_net_payout             numeric,
  ADD COLUMN IF NOT EXISTS platform_vat_liability      numeric,
  ADD COLUMN IF NOT EXISTS vat_snapshot_at             timestamptz DEFAULT now();

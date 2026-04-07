/**
 * VAT calculation for Unseeny marketplace.
 *
 * Architecture:
 * - Unseeny acts as a disclosed agent: hosts are the suppliers of accommodation.
 * - VAT is applied ONLY on Unseeny's service fees (guest markup + host commission).
 * - VAT on accommodation is the host's own responsibility (most private hosts are
 *   below the VAT threshold and charge nothing).
 *
 * Current setup: Belgian rate (21%) applied to all service fees.
 * Future: per-country rates via the `vat_rates` table once OSS is active.
 */

export type VatTreatment = "standard" | "reverse_charge";

/**
 * Full VAT breakdown for a single booking night (multiply by nights for totals).
 */
export type VatBreakdown = {
  /** Pure accommodation cost — no VAT, host's own supply. */
  accommodationBase: number;

  /** Unseeny guest-facing service fee, VAT excluded. */
  guestFeeExclVat: number;
  guestFeeVatRate: number;
  guestFeeVatAmount: number;
  guestVatTreatment: VatTreatment;

  /** What the guest pays in total (accommodation + fee + VAT on fee). */
  guestTotal: number;

  /** Unseeny commission deducted from host payout, VAT excluded. */
  hostCommissionExcl: number;
  hostCommissionVatRate: number;
  hostCommissionVatAmount: number;
  hostVatTreatment: VatTreatment;

  /** What the host receives after commission and VAT on commission. */
  hostPayout: number;

  /** Total platform revenue (fees only, before remitting VAT). */
  platformGross: number;
  /** VAT Unseeny must remit to the tax authority. */
  platformVatLiability: number;
  /** Unseeny net margin after VAT remittance. */
  platformNet: number;
};

/**
 * Determine VAT treatment for a party (guest or host).
 *
 * Rules:
 * - B2C (no VAT number): standard rate.
 * - B2B same country as platform: standard rate.
 * - B2B different EU country: reverse charge (0% from our side, they self-assess).
 */
export function determineVatTreatment(
  isVatRegistered: boolean,
  partyCountry: string | null | undefined,
  platformCountry = "BE",
): VatTreatment {
  if (!isVatRegistered) return "standard";
  if (!partyCountry || partyCountry.toUpperCase() === platformCountry.toUpperCase()) return "standard";
  return "reverse_charge";
}

/**
 * Compute the full VAT breakdown from the stored guest price (excl. VAT).
 *
 * `guestPriceExclVat` is what is currently stored as `price_per_night` — it
 * includes the guest markup but NOT yet VAT. `guestTotal` is what Stripe
 * should actually charge.
 */
export function calcVatBreakdown(
  guestPriceExclVat: number,
  guestMarkupPct: number,
  hostFeePct: number,
  vatPct: number,
  guestVatTreatment: VatTreatment = "standard",
  hostVatTreatment: VatTreatment = "standard",
): VatBreakdown {
  const accommodationBase = r2(guestPriceExclVat / (1 + guestMarkupPct));
  const guestFeeExclVat    = r2(guestPriceExclVat - accommodationBase);

  const guestFeeVatRate    = guestVatTreatment === "standard" ? vatPct : 0;
  const guestFeeVatAmount  = r2(guestFeeExclVat * guestFeeVatRate);
  const guestTotal         = r2(guestPriceExclVat + guestFeeVatAmount);

  const hostCommissionExcl       = r2(accommodationBase * hostFeePct);
  const hostCommissionVatRate    = hostVatTreatment === "standard" ? vatPct : 0;
  const hostCommissionVatAmount  = r2(hostCommissionExcl * hostCommissionVatRate);
  const hostPayout               = r2(accommodationBase - hostCommissionExcl - hostCommissionVatAmount);

  const platformGross         = r2(guestFeeExclVat + hostCommissionExcl);
  const platformVatLiability  = r2(guestFeeVatAmount + hostCommissionVatAmount);
  const platformNet           = r2(platformGross - platformVatLiability);

  return {
    accommodationBase,
    guestFeeExclVat, guestFeeVatRate, guestFeeVatAmount, guestVatTreatment,
    guestTotal,
    hostCommissionExcl, hostCommissionVatRate, hostCommissionVatAmount, hostVatTreatment,
    hostPayout,
    platformGross, platformVatLiability, platformNet,
  };
}

/**
 * Reverse calculation: host enters what they want to net (after commission + VAT).
 * Returns the guest price (excl. VAT) to pass to calcVatBreakdown.
 */
export function hostNetToGuestPrice(
  hostNet: number,
  guestMarkupPct: number,
  hostFeePct: number,
  vatPct: number,
  hostVatTreatment: VatTreatment = "standard",
): number {
  const hostVatRate = hostVatTreatment === "standard" ? vatPct : 0;
  // hostNet = accommodationBase × (1 − hostFee × (1 + hostVatRate))
  const accommodationBase = hostNet / (1 - hostFeePct * (1 + hostVatRate));
  return r2(accommodationBase * (1 + guestMarkupPct));
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

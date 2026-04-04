/**
 * Platform fee configuration — fetched from DB, with hard-coded fallback.
 * All fee values are fractions (0.02 = 2%, 0.10 = 10%).
 */

export type PlatformConfig = {
  host_fee_pct: number;     // deducted from host's base price
  guest_markup_pct: number; // added on top of base price for guest
};

export const DEFAULT_CONFIG: PlatformConfig = {
  host_fee_pct: 0.02,
  guest_markup_pct: 0.10,
};

// ─── Pricing calculations ─────────────────────────────────────────────────────

/**
 * Host entered what they want to EARN.
 * Returns what the guest will be charged.
 */
export function hostEarnsToGuestPrice(hostEarns: number, cfg: PlatformConfig): number {
  return (hostEarns * (1 + cfg.guest_markup_pct)) / (1 - cfg.host_fee_pct);
}

/**
 * Host entered what the GUEST will PAY.
 * Returns the host's net payout.
 */
export function guestPriceToHostPayout(guestPays: number, cfg: PlatformConfig): number {
  return (guestPays * (1 - cfg.host_fee_pct)) / (1 + cfg.guest_markup_pct);
}

/**
 * Given a guest price and config, compute the host payout.
 * Alias kept for clarity in booking/refund logic.
 */
export function calcHostPayout(guestPrice: number, cfg: PlatformConfig): number {
  return guestPriceToHostPayout(guestPrice, cfg);
}

/** Platform take per night = guest_price - host_payout */
export function calcPlatformTake(guestPrice: number, cfg: PlatformConfig): number {
  return guestPrice - calcHostPayout(guestPrice, cfg);
}

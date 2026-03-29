/** Unseeny platform fee as a fraction (e.g. 0.12 = 12%) */
export const PLATFORM_FEE = 0.12;

/** Returns the platform's cut from a gross booking amount */
export function platformFee(gross: number): number {
  return gross * PLATFORM_FEE;
}

/** Returns the host payout from a gross booking amount */
export function hostPayout(gross: number): number {
  return gross * (1 - PLATFORM_FEE);
}

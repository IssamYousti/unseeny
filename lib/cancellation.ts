/**
 * Cancellation policy — refund calculation + timezone-aware cutoff logic.
 * All monetary values in euros (not cents).
 */

export type PolicyType = "flexible" | "moderate" | "strict" | "custom";

export type CancellationPolicy = {
  policy_type: PolicyType;
  full_refund_days_before: number;
  partial_refund_days_before: number;
  partial_refund_percentage: number;
  cutoff_hour: number;     // 0-23
  timezone: string;        // IANA, e.g. "Europe/Amsterdam"
};

export type RefundTier = "full" | "partial" | "none";

export type RefundResult = {
  tier: RefundTier;
  percentage: number;          // 0 | partial_refund_percentage | 100
  amount: number;              // euros
  full_cutoff: Date;           // UTC date of full-refund deadline
  partial_cutoff: Date | null; // UTC date of partial-refund deadline (null when pct=0)
  explanation: string;
};

// ─── Preset policies ──────────────────────────────────────────────────────────

export const POLICY_PRESETS: Record<
  Exclude<PolicyType, "custom">,
  Omit<CancellationPolicy, "policy_type" | "timezone">
> = {
  flexible: {
    full_refund_days_before: 1,
    partial_refund_days_before: 0,
    partial_refund_percentage: 0,
    cutoff_hour: 18,
  },
  moderate: {
    full_refund_days_before: 5,
    partial_refund_days_before: 1,
    partial_refund_percentage: 50,
    cutoff_hour: 18,
  },
  strict: {
    full_refund_days_before: 14,
    partial_refund_days_before: 7,
    partial_refund_percentage: 50,
    cutoff_hour: 18,
  },
};

export const POLICY_LABELS: Record<PolicyType, string> = {
  flexible: "Flexible",
  moderate: "Moderate",
  strict: "Strict",
  custom: "Custom",
};

export const POLICY_SUMMARIES: Record<PolicyType, string> = {
  flexible: "Full refund if cancelled 24 h before check-in.",
  moderate: "Full refund 5 days before. 50% refund 1 day before.",
  strict: "Full refund 14 days before. 50% refund 7 days before.",
  custom: "Custom cancellation terms set by the host.",
};

// ─── Timezone-aware cutoff ────────────────────────────────────────────────────

/**
 * Returns the UTC Date corresponding to `cutoff_hour:00:00` on the date that is
 * `daysOffset` days from `checkIn`, all expressed in `timezone`.
 *
 * Example: checkIn="2026-05-10", daysOffset=-5, cutoffHour=18, timezone="Europe/Paris"
 *   → returns UTC equivalent of "2026-05-05T18:00:00 Europe/Paris"
 */
export function getCutoffDate(
  checkIn: string,    // YYYY-MM-DD
  daysOffset: number, // negative = before check-in
  cutoffHour: number,
  timezone: string,
): Date {
  // Step 1: compute target calendar date
  const base = new Date(checkIn + "T12:00:00Z"); // noon UTC avoids DST edge cases
  base.setUTCDate(base.getUTCDate() + daysOffset);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  const h = String(cutoffHour).padStart(2, "0");

  // Step 2: build a "naive UTC" date at the target local hour, then correct for offset
  // Treat the local time string as UTC first, format it back in the target timezone,
  // compute the drift, and subtract it to get the actual UTC equivalent.
  const naiveUtc = new Date(`${y}-${m}-${d}T${h}:00:00Z`);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(naiveUtc);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  // What the timezone thinks naiveUtc is in local time
  const representedLocal = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
  );

  // Offset: naiveUtc seen as local time differs from what we want by this amount
  const offsetMs = naiveUtc.getTime() - representedLocal.getTime();
  return new Date(naiveUtc.getTime() + offsetMs);
}

// ─── Refund calculation ───────────────────────────────────────────────────────

/**
 * Calculate how much the guest gets back if they cancel `now`.
 * `totalPrice` is in euros.
 */
export function calculateRefund(
  totalPrice: number,
  checkIn: string,         // YYYY-MM-DD
  cancelledAt: Date,
  policy: CancellationPolicy,
): RefundResult {
  const { full_refund_days_before, partial_refund_days_before,
          partial_refund_percentage, cutoff_hour, timezone } = policy;

  const fullCutoff = getCutoffDate(checkIn, -full_refund_days_before, cutoff_hour, timezone);
  const hasPartial = partial_refund_percentage > 0 && partial_refund_days_before >= 0;
  const partialCutoff = hasPartial
    ? getCutoffDate(checkIn, -partial_refund_days_before, cutoff_hour, timezone)
    : null;

  if (cancelledAt <= fullCutoff) {
    return {
      tier: "full",
      percentage: 100,
      amount: totalPrice,
      full_cutoff: fullCutoff,
      partial_cutoff: partialCutoff,
      explanation: "Full refund — cancelled before the full-refund deadline.",
    };
  }

  if (partialCutoff && cancelledAt <= partialCutoff) {
    const amount = Math.round((totalPrice * partial_refund_percentage) / 100 * 100) / 100;
    return {
      tier: "partial",
      percentage: partial_refund_percentage,
      amount,
      full_cutoff: fullCutoff,
      partial_cutoff: partialCutoff,
      explanation: `${partial_refund_percentage}% refund — cancelled after full-refund deadline but before partial-refund deadline.`,
    };
  }

  return {
    tier: "none",
    percentage: 0,
    amount: 0,
    full_cutoff: fullCutoff,
    partial_cutoff: partialCutoff,
    explanation: "No refund — cancelled after all deadlines.",
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/** Format a UTC date into the listing's local timezone for display. */
export function formatCutoffLocal(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Common IANA timezones ────────────────────────────────────────────────────

export const COMMON_TIMEZONES: { label: string; value: string }[] = [
  // Europe
  { label: "UTC",                     value: "UTC" },
  { label: "London (GMT/BST)",         value: "Europe/London" },
  { label: "Amsterdam / Paris / Berlin", value: "Europe/Amsterdam" },
  { label: "Helsinki / Athens",        value: "Europe/Helsinki" },
  { label: "Lisbon",                   value: "Europe/Lisbon" },
  { label: "Moscow",                   value: "Europe/Moscow" },
  // Middle East & Africa
  { label: "Dubai (UAE)",              value: "Asia/Dubai" },
  { label: "Riyadh (KSA)",             value: "Asia/Riyadh" },
  { label: "Istanbul",                 value: "Europe/Istanbul" },
  { label: "Cairo",                    value: "Africa/Cairo" },
  { label: "Casablanca",               value: "Africa/Casablanca" },
  { label: "Nairobi",                  value: "Africa/Nairobi" },
  // Asia
  { label: "Karachi",                  value: "Asia/Karachi" },
  { label: "Mumbai / Delhi",           value: "Asia/Kolkata" },
  { label: "Dhaka",                    value: "Asia/Dhaka" },
  { label: "Jakarta",                  value: "Asia/Jakarta" },
  { label: "Kuala Lumpur / Singapore", value: "Asia/Singapore" },
  { label: "Bangkok",                  value: "Asia/Bangkok" },
  { label: "Tokyo / Seoul",            value: "Asia/Tokyo" },
  // Americas
  { label: "New York (ET)",            value: "America/New_York" },
  { label: "Chicago (CT)",             value: "America/Chicago" },
  { label: "Denver (MT)",              value: "America/Denver" },
  { label: "Los Angeles (PT)",         value: "America/Los_Angeles" },
  { label: "Toronto",                  value: "America/Toronto" },
  { label: "São Paulo",                value: "America/Sao_Paulo" },
  // Oceania
  { label: "Sydney / Melbourne",       value: "Australia/Sydney" },
  { label: "Auckland",                 value: "Pacific/Auckland" },
];

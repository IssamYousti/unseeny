import { createClient } from "@/lib/supabase/server";
import { POLICY_LABELS } from "@/lib/cancellation";
import { ShieldCheck, RotateCcw, AlertCircle } from "lucide-react";

type Props = { listingId: string };

type PolicyRow = {
  policy_type: string;
  full_refund_days_before: number;
  partial_refund_days_before: number;
  partial_refund_percentage: number;
  cutoff_hour: number;
  timezone: string;
};

function cutoffLabel(hour: number): string {
  const ampm = hour < 12 ? "AM" : "PM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:00 ${ampm}`;
}

function daysLabel(days: number): string {
  if (days === 0) return "same day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export default async function CancellationPolicyDisplay({ listingId }: Props) {
  const supabase = await createClient();

  const { data: policy } = await supabase
    .from("listing_cancellation_policy")
    .select(
      "policy_type, full_refund_days_before, partial_refund_days_before, partial_refund_percentage, cutoff_hour, timezone",
    )
    .eq("listing_id", listingId)
    .maybeSingle();

  // Fall back to moderate defaults if no policy set
  const p: PolicyRow = policy ?? {
    policy_type: "moderate",
    full_refund_days_before: 5,
    partial_refund_days_before: 1,
    partial_refund_percentage: 50,
    cutoff_hour: 18,
    timezone: "UTC",
  };

  const hasPartial = p.partial_refund_percentage > 0;
  const typeLabel = POLICY_LABELS[p.policy_type as keyof typeof POLICY_LABELS] ?? p.policy_type;

  const tiers: { icon: React.ReactNode; label: string; desc: string; color: string }[] = [
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Full refund",
      desc: `Cancel ${daysLabel(p.full_refund_days_before)} or more before check-in (before ${cutoffLabel(p.cutoff_hour)})`,
      color: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  if (hasPartial) {
    tiers.push({
      icon: <RotateCcw className="h-4 w-4" />,
      label: `${p.partial_refund_percentage}% refund`,
      desc: `Cancel ${daysLabel(p.partial_refund_days_before)} or more before check-in (before ${cutoffLabel(p.cutoff_hour)})`,
      color: "text-amber-600 dark:text-amber-400",
    });
  }

  tiers.push({
    icon: <AlertCircle className="h-4 w-4" />,
    label: "No refund",
    desc: `Cancellations less than ${daysLabel(hasPartial ? p.partial_refund_days_before : p.full_refund_days_before)} before check-in`,
    color: "text-rose-500 dark:text-rose-400",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Cancellation policy
        </span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted border border-border font-medium">
          {typeLabel}
        </span>
      </div>

      <div className="space-y-3">
        {tiers.map((tier, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`mt-0.5 shrink-0 ${tier.color}`}>{tier.icon}</div>
            <div>
              <p className={`text-sm font-semibold ${tier.color}`}>{tier.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tier.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60">
        Deadlines are calculated at {cutoffLabel(p.cutoff_hour)} in the listing&apos;s local timezone ({p.timezone}).
      </p>
    </div>
  );
}

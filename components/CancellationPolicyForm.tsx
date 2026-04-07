"use client";

import { useState, useTransition, useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { POLICY_PRESETS, POLICY_LABELS, POLICY_SUMMARIES, type PolicyType, type CancellationPolicy } from "@/lib/cancellation";
import { saveCancellationPolicy } from "@/app/(protected)/listings/manage/[id]/policy-actions";

type Props = {
  listingId: string;
  initial: Partial<CancellationPolicy> | null;
  /** IANA timezone auto-detected from the listing's address. Used as default when no policy has been saved yet. */
  listingTimezone?: string;
};

const TYPES: PolicyType[] = ["flexible", "moderate", "strict", "custom"];

export default function CancellationPolicyForm({ listingId, initial, listingTimezone }: Props) {
  const [type, setType] = useState<PolicyType>(initial?.policy_type ?? "moderate");
  const [timezone, setTimezone] = useState(initial?.timezone ?? listingTimezone ?? "UTC");

  // Update timezone live when the host selects an address in the address autocomplete
  useEffect(() => {
    function handler(e: Event) {
      setTimezone((e as CustomEvent<string>).detail);
    }
    window.addEventListener("unseeny:timezone-detected", handler);
    return () => window.removeEventListener("unseeny:timezone-detected", handler);
  }, []);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const preset = type !== "custom" ? POLICY_PRESETS[type as Exclude<PolicyType, "custom">] : null;
  const custom = type === "custom";

  const [fullDays, setFullDays] = useState(
    initial?.full_refund_days_before ?? preset?.full_refund_days_before ?? 5,
  );
  const [partialDays, setPartialDays] = useState(
    initial?.partial_refund_days_before ?? preset?.partial_refund_days_before ?? 1,
  );
  const [partialPct, setPartialPct] = useState(
    initial?.partial_refund_percentage ?? preset?.partial_refund_percentage ?? 50,
  );
  const [cutoffHour, setCutoffHour] = useState(initial?.cutoff_hour ?? 18);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveCancellationPolicy(listingId, fd);
      if (result.error) { setErrMsg(result.error); setStatus("error"); }
      else setStatus("saved");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Policy type selector */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TYPES.map((t) => (
          <label
            key={t}
            className={`relative flex flex-col gap-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              type === t
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <input
              type="radio"
              name="policy_type"
              value={t}
              checked={type === t}
              onChange={() => {
                setType(t);
                if (t !== "custom" && POLICY_PRESETS[t as Exclude<PolicyType,"custom">]) {
                  const p = POLICY_PRESETS[t as Exclude<PolicyType,"custom">];
                  setFullDays(p.full_refund_days_before);
                  setPartialDays(p.partial_refund_days_before);
                  setPartialPct(p.partial_refund_percentage);
                  setCutoffHour(p.cutoff_hour);
                }
              }}
              className="sr-only"
            />
            <span className="text-sm font-semibold">{POLICY_LABELS[t]}</span>
            <span className="text-xs text-muted-foreground leading-snug">{POLICY_SUMMARIES[t]}</span>
          </label>
        ))}
      </div>

      {/* Custom fields — visible only for "custom" type */}
      {custom && (
        <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Custom thresholds
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Full refund — days before check-in
              </label>
              <input
                type="number"
                name="full_refund_days_before"
                min={0}
                max={365}
                value={fullDays}
                onChange={(e) => setFullDays(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Partial refund — days before check-in
              </label>
              <input
                type="number"
                name="partial_refund_days_before"
                min={0}
                max={365}
                value={partialDays}
                onChange={(e) => setPartialDays(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Partial refund percentage (%)
              </label>
              <input
                type="number"
                name="partial_refund_percentage"
                min={0}
                max={100}
                value={partialPct}
                onChange={(e) => setPartialPct(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-w-xs">
            <label className="text-xs font-medium text-muted-foreground">
              Daily cutoff time (local hour, 0–23)
            </label>
            <input
              type="number"
              name="cutoff_hour"
              min={0}
              max={23}
              value={cutoffHour}
              onChange={(e) => setCutoffHour(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground/60">
              e.g. 18 = 6:00 PM. Deadlines are calculated at this hour in the listing&apos;s timezone.
            </p>
          </div>
        </div>
      )}

      {/* Hidden fields for preset values */}
      {!custom && (
        <>
          <input type="hidden" name="full_refund_days_before"   value={fullDays} />
          <input type="hidden" name="partial_refund_days_before" value={partialDays} />
          <input type="hidden" name="partial_refund_percentage"  value={partialPct} />
          <input type="hidden" name="cutoff_hour"               value={cutoffHour} />
        </>
      )}

      {/* Timezone — auto-detected from the listing address, not editable */}
      <input type="hidden" name="timezone" value={timezone} />
      <p className="text-xs text-muted-foreground/60">
        Timezone: <span className="font-medium text-foreground">{timezone}</span>
        {" "}— auto-detected from the listing address. Cancellation deadlines are shown in this timezone.
      </p>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save policy"}
        </button>
        {status === "saved" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        {status === "error" && (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {errMsg}
          </span>
        )}
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { saveListingRules } from "@/app/(protected)/listings/manage/[id]/policy-actions";

type Rules = {
  check_in_from?: string | null;
  check_in_until?: string | null;
  checkout_before?: string | null;
  self_checkin_method?: string | null;
  pets_allowed?: boolean | null;
  smoking_allowed?: boolean | null;
  parties_allowed?: boolean | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  commercial_photography?: boolean | null;
  additional_rules?: string | null;
  return_keys?: boolean | null;
  lock_up?: boolean | null;
  turn_things_off?: boolean | null;
};

type Props = { listingId: string; initial: Rules | null };

const CHECKIN_METHODS = [
  { value: "host",        label: "Host present" },
  { value: "lockbox",     label: "Lockbox" },
  { value: "keypad",      label: "Keypad / digital lock" },
  { value: "smart_lock",  label: "Smart lock" },
  { value: "doorman",     label: "Doorman / concierge" },
];

export default function PropertyRulesForm({ listingId, initial }: Props) {
  const r = initial ?? {};
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveListingRules(listingId, fd);
      if (result.error) { setErrMsg(result.error); setStatus("error"); }
      else setStatus("saved");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Check-in / out ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Check-in &amp; check-out
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <TimeField label="Check-in from"    name="check_in_from"    defaultValue={r.check_in_from ?? "15:00"} />
          <TimeField label="Check-in until"   name="check_in_until"   defaultValue={r.check_in_until ?? "22:00"} />
          <TimeField label="Checkout before"  name="checkout_before"  defaultValue={r.checkout_before ?? "11:00"} />
        </div>

        <div className="space-y-1.5 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Self check-in method
          </label>
          <select
            name="self_checkin_method"
            defaultValue={r.self_checkin_method ?? "host"}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {CHECKIN_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── During your stay ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          During your stay
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Toggle name="pets_allowed"   label="Pets allowed"              defaultChecked={r.pets_allowed ?? false} />
          <Toggle name="smoking_allowed" label="Smoking allowed"          defaultChecked={r.smoking_allowed ?? false} />
          <Toggle name="parties_allowed" label="Parties / events allowed" defaultChecked={r.parties_allowed ?? false} />
          <Toggle name="commercial_photography" label="Commercial photography allowed" defaultChecked={r.commercial_photography ?? false} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-sm">
          <TimeField label="Quiet hours from"  name="quiet_hours_start" defaultValue={r.quiet_hours_start ?? "22:00"} />
          <TimeField label="Quiet hours until" name="quiet_hours_end"   defaultValue={r.quiet_hours_end ?? "09:00"} />
        </div>
      </div>

      {/* ── Before you leave ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Before you leave
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Toggle name="return_keys"     label="Return keys"    defaultChecked={r.return_keys ?? true} />
          <Toggle name="lock_up"         label="Lock up"        defaultChecked={r.lock_up ?? true} />
          <Toggle name="turn_things_off" label="Turn things off" defaultChecked={r.turn_things_off ?? true} />
        </div>
      </div>

      {/* ── Additional rules (freeform) ───────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          htmlFor="additional_rules"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Additional rules (optional)
        </label>
        <textarea
          id="additional_rules"
          name="additional_rules"
          rows={3}
          defaultValue={r.additional_rules ?? ""}
          placeholder="e.g. No commercial photography · Keep the garden tidy…"
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* ── Save ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save rules"}
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

function TimeField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        {label}
      </label>
      <input
        type="time"
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`h-5 w-9 rounded-full relative transition-colors shrink-0 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

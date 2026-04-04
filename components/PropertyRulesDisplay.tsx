import { createClient } from "@/lib/supabase/server";
import { Clock, LogIn, LogOut, Key, Volume2, Camera, PawPrint, Cigarette, PartyPopper, RotateCcw, Lock, Zap } from "lucide-react";

type Props = { listingId: string };

const CHECKIN_LABELS: Record<string, string> = {
  host: "Host present",
  lockbox: "Lockbox",
  keypad: "Keypad / digital lock",
  smart_lock: "Smart lock",
  doorman: "Doorman / concierge",
};

function fmt(time: string | null | undefined): string {
  if (!time) return "—";
  // time is "HH:MM:SS" or "HH:MM"
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export default async function PropertyRulesDisplay({ listingId }: Props) {
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("listing_rules")
    .select("*")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (!rules) return null;

  const allowed: { icon: React.ReactNode; label: string; ok: boolean }[] = [
    { icon: <PawPrint className="h-3.5 w-3.5" />, label: "Pets", ok: rules.pets_allowed },
    { icon: <Cigarette className="h-3.5 w-3.5" />, label: "Smoking", ok: rules.smoking_allowed },
    { icon: <PartyPopper className="h-3.5 w-3.5" />, label: "Parties / events", ok: rules.parties_allowed },
    { icon: <Camera className="h-3.5 w-3.5" />, label: "Commercial photography", ok: rules.commercial_photography },
  ];

  const checkout: { icon: React.ReactNode; label: string; required: boolean }[] = [
    { icon: <Key className="h-3.5 w-3.5" />, label: "Return keys", required: rules.return_keys },
    { icon: <Lock className="h-3.5 w-3.5" />, label: "Lock up", required: rules.lock_up },
    { icon: <Zap className="h-3.5 w-3.5" />, label: "Turn things off", required: rules.turn_things_off },
  ];

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        House rules
      </p>

      {/* Check-in / out */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
          <LogIn className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium">Check-in</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(rules.check_in_from)} – {fmt(rules.check_in_until)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
          <LogOut className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium">Checkout</p>
            <p className="text-xs text-muted-foreground mt-0.5">Before {fmt(rules.checkout_before)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium">Self check-in</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {CHECKIN_LABELS[rules.self_checkin_method] ?? rules.self_checkin_method}
            </p>
          </div>
        </div>
      </div>

      {/* During stay */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">During your stay</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {allowed.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm ${
                item.ok
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted/30 border-border/60 text-muted-foreground"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-xs font-medium">{item.ok ? "" : "No "}{item.label}</span>
            </div>
          ))}
        </div>

        {/* Quiet hours */}
        {rules.quiet_hours_start && rules.quiet_hours_end && (
          <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-muted/30">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">
              Quiet hours: {fmt(rules.quiet_hours_start)} – {fmt(rules.quiet_hours_end)}
            </span>
          </div>
        )}
      </div>

      {/* Before leaving */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Before you leave</p>
        <div className="flex flex-wrap gap-2">
          {checkout.filter((c) => c.required).map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/60 text-xs font-medium text-muted-foreground"
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Additional rules */}
      {rules.additional_rules && (
        <div className="bg-muted/30 rounded-xl border border-border/60 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Additional rules</p>
          <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
            {rules.additional_rules}
          </p>
        </div>
      )}
    </div>
  );
}

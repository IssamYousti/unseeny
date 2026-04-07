"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { updateProfile } from "./actions";
import {
  CheckCircle2,
  AlertCircle,
  User,
  AtSign,
  Calendar,
  Globe,
  Sparkles,
  Building2,
  Receipt,
} from "lucide-react";

type Props = {
  profile: {
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    dob?: string | null;
    host_bio?: string | null;
    hosting_since?: string | null;
    languages?: string[] | null;
    is_business?: boolean | null;
    vat_number?: string | null;
    billing_country?: string | null;
  };
  isHost?: boolean;
};

type State = { success?: boolean; error?: string } | null;

// ── Field atoms ───────────────────────────────────────────────────────────────

function InputField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  icon,
  helper,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className="group space-y-1.5">
      <label
        htmlFor={name}
        className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-primary"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary/60">
            {icon}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-border bg-background py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 ${icon ? "pl-10 pr-4" : "px-4"}`}
        />
      </div>
      {helper && (
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed pl-0.5">
          {helper}
        </p>
      )}
    </div>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 5,
  helper,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  rows?: number;
  helper?: string;
}) {
  return (
    <div className="group space-y-1.5">
      <label
        htmlFor={name}
        className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-primary"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 resize-none leading-relaxed"
      />
      {helper && (
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed pl-0.5">
          {helper}
        </p>
      )}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  accentColor = "from-primary/80 via-primary to-primary/40",
  children,
}: {
  title: string;
  subtitle?: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Geometric accent bar — 3 layered stripes */}
      <div className="relative h-1.5 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-r ${accentColor}`} />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_12px,rgba(255,255,255,0.08)_12px,rgba(255,255,255,0.08)_13px)]" />
      </div>

      <div className="px-6 pt-5 pb-1 border-b border-border/60">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ProfileForm({ profile, isHost }: Props) {
  const [state, action, isPending] = useActionState<State, FormData>(
    updateProfile,
    null
  );
  const [isBusiness, setIsBusiness] = useState(profile.is_business ?? false);

  const languagesValue = (profile.languages ?? []).join(", ");

  // Scroll success message into view on save
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state && statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [state]);

  return (
    <form action={action} className="space-y-6">

      {/* ── Personal information ─────────────────────────────────────────── */}
      <SectionCard
        title="Personal information"
        subtitle="Your basic details. Only your first name and username are visible to others."
      >
        <div className="grid sm:grid-cols-2 gap-5">
          <InputField
            label="First name"
            name="first_name"
            defaultValue={profile.first_name ?? ""}
            placeholder="Your first name"
            icon={<User className="h-3.5 w-3.5" />}
          />
          <InputField
            label="Last name"
            name="last_name"
            defaultValue={profile.last_name ?? ""}
            placeholder="Your last name"
            icon={<User className="h-3.5 w-3.5" />}
          />
        </div>

        <InputField
          label="Username"
          name="username"
          defaultValue={profile.username ?? ""}
          placeholder="your_username"
          required
          icon={<AtSign className="h-3.5 w-3.5" />}
          helper="Used across the platform. Letters, numbers, and underscores only."
        />

        <InputField
          label="Date of birth"
          name="dob"
          type="date"
          defaultValue={profile.dob ?? ""}
          icon={<Calendar className="h-3.5 w-3.5" />}
          helper="Used to verify you meet age requirements. Never shown publicly."
        />
      </SectionCard>

      {/* ── Host profile ─────────────────────────────────────────────────── */}
      {isHost && (
        <SectionCard
          title="Host profile"
          subtitle="Help guests get to know you. A warm, personal introduction builds trust."
          accentColor="from-amber-500/70 via-amber-400 to-amber-500/30"
        >
          <TextareaField
            label="About you"
            name="host_bio"
            defaultValue={profile.host_bio ?? ""}
            placeholder="Tell guests about yourself — your background, what you love about hosting, what makes your property special, and the kind of experience you create for families…"
            rows={5}
            helper="Guests read this before sending a booking request. Be warm and genuine."
          />

          <InputField
            label="Languages spoken"
            name="languages"
            defaultValue={languagesValue}
            placeholder="e.g. English, Arabic, French"
            icon={<Globe className="h-3.5 w-3.5" />}
            helper="Separate multiple languages with commas."
          />

          <InputField
            label="Hosting since"
            name="hosting_since"
            type="date"
            defaultValue={profile.hosting_since ?? ""}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            helper="The date you started hosting on Unseeny (or any similar platform)."
          />
        </SectionCard>
      )}

      {/* ── Billing & VAT ────────────────────────────────────────────────── */}
      <SectionCard
        title="Billing & VAT"
        subtitle="Required for correct VAT treatment on Unseeny service fees."
        accentColor="from-emerald-500/70 via-emerald-400 to-emerald-500/30"
      >
        {/* Is business toggle */}
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">I represent a business</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Enables reverse charge if you are VAT-registered in another EU country.
              </p>
            </div>
          </div>
          <div
            onClick={() => setIsBusiness((v) => !v)}
            className={`h-6 w-11 rounded-full relative transition-colors shrink-0 cursor-pointer ${isBusiness ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isBusiness ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <input type="hidden" name="is_business" value={isBusiness ? "true" : "false"} />
        </label>

        {isBusiness && (
          <>
            <InputField
              label="VAT number"
              name="vat_number"
              defaultValue={profile.vat_number ?? ""}
              placeholder="BE0123456789"
              icon={<Receipt className="h-3.5 w-3.5" />}
              helper="Include country prefix (e.g. BE, NL, DE). We verify via VIES before applying reverse charge."
            />
            <InputField
              label="Billing country"
              name="billing_country"
              defaultValue={profile.billing_country ?? ""}
              placeholder="BE"
              icon={<Globe className="h-3.5 w-3.5" />}
              helper="ISO 3166-1 two-letter country code (e.g. BE, NL, DE, FR)."
            />
          </>
        )}
      </SectionCard>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div
        ref={statusRef}
        className="flex items-center justify-between gap-4 pt-1"
      >
        {/* Status message */}
        <div className="min-h-[1.5rem] flex items-center">
          {state?.success && (
            <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              Profile saved successfully
            </span>
          )}
          {state?.error && (
            <span className="flex items-center gap-2 text-sm text-destructive animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
              {state.error}
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={isPending}
          className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}

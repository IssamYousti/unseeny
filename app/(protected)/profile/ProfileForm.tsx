"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  profile: {
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    dob?: string | null;
  };
  labels: {
    username: string;
    first_name: string;
    last_name: string;
    dob: string;
    save: string;
    saved: string;
  };
};

type State = { success?: boolean; error?: string } | null;

export default function ProfileForm({ profile, labels }: Props) {
  const [state, action, isPending] = useActionState<State, FormData>(updateProfile, null);

  return (
    <form action={action} className="space-y-0">

      <Field label={labels.first_name} name="first_name" defaultValue={profile.first_name ?? ""} />
      <Field label={labels.last_name} name="last_name" defaultValue={profile.last_name ?? ""} />
      <Field label={labels.username} name="username" defaultValue={profile.username ?? ""} required />
      <Field label={labels.dob} name="dob" type="date" defaultValue={profile.dob ?? ""} last />

      <div className="pt-6 flex items-center justify-between gap-4">
        <div className="h-5">
          {state?.success && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {labels.saved}
            </span>
          )}
          {state?.error && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-foreground text-background px-6 py-2 rounded-full text-sm font-medium hover:opacity-80 transition disabled:opacity-40"
        >
          {isPending ? "…" : labels.save}
        </button>
      </div>

    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  last,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-6 py-4 ${last ? "" : "border-b border-border/60"}`}>
      <label
        htmlFor={name}
        className="w-32 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { subscribeToNotifications } from "@/app/(protected)/listings/notify-actions";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";

type State = { success?: boolean; error?: string; already?: boolean } | null;

export default function NotifyBanner({ defaultEmail, isSubscribed }: { defaultEmail?: string; isSubscribed?: boolean }) {
  const [state, action, isPending] = useActionState<State, FormData>(
    subscribeToNotifications,
    null,
  );

  const done = isSubscribed || state?.success || state?.already;

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">

        {/* Icon + copy */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Get notified when new properties are listed</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
              New verified properties are added regularly. We&apos;ll email you the moment one goes live.
            </p>
          </div>
        </div>

        {/* Form or confirmation */}
        <div className="sm:shrink-0">
          {done ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {(isSubscribed || state?.already) ? "You're already subscribed." : "You're subscribed!"}
            </div>
          ) : (
            <form action={action} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  name="email"
                  defaultValue={defaultEmail ?? ""}
                  placeholder="your@email.com"
                  required
                  disabled={isPending}
                  className="flex-1 sm:w-56 bg-background border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 min-w-0"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-40 shrink-0"
                >
                  {isPending ? "…" : "Notify me"}
                </button>
              </div>
              {state?.error && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {state.error}
                </div>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { X, AlertTriangle, RotateCcw, ShieldOff } from "lucide-react";
import { cancelBooking } from "@/app/(protected)/bookings/actions";

export type RefundPreview = {
  tier: "full" | "partial" | "none";
  percentage: number;
  amount: number;
  explanation: string;
};

type Props = {
  bookingId: string;
  totalPrice: number;
  refundPreview: RefundPreview | null; // null = no policy / no Stripe session
};

const TIER_STYLES = {
  full: {
    icon: <RotateCcw className="h-5 w-5 text-emerald-500" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40",
  },
  partial: {
    icon: <RotateCcw className="h-5 w-5 text-amber-500" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40",
  },
  none: {
    icon: <ShieldOff className="h-5 w-5 text-rose-500" />,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40",
  },
};

export default function CancelBookingButton({ bookingId, totalPrice, refundPreview }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleCancel() {
    setError("");
    startTransition(async () => {
      try {
        await cancelBooking(bookingId);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const tier = refundPreview?.tier ?? "none";
  const styles = TIER_STYLES[tier];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition"
      >
        <X className="h-3.5 w-3.5" />
        Cancel booking
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md bg-background border border-border rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Cancel this booking?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This action cannot be undone. The dates will become available again.
                </p>
              </div>
            </div>

            {/* Refund preview */}
            {refundPreview ? (
              <div className={`rounded-xl border px-4 py-4 space-y-2 ${styles.bg}`}>
                <div className="flex items-center gap-2">
                  {styles.icon}
                  <p className={`text-sm font-semibold ${styles.color}`}>
                    {tier === "full" && "You will receive a full refund"}
                    {tier === "partial" && `You will receive a ${refundPreview.percentage}% refund`}
                    {tier === "none" && "No refund applies"}
                  </p>
                </div>
                {tier !== "none" && (
                  <p className={`text-lg font-bold ${styles.color}`}>
                    €{refundPreview.amount.toLocaleString("en", { minimumFractionDigits: 2 })}
                    <span className="text-sm font-normal ml-1 text-muted-foreground">
                      of €{totalPrice.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {refundPreview.explanation}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  No payment was charged for this booking.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition disabled:opacity-40"
              >
                Keep booking
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
              >
                {isPending ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

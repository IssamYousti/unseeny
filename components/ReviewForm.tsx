"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/app/(protected)/bookings/actions";
import StarPicker from "./StarPicker";
import { CheckCircle, AlertCircle } from "lucide-react";

type Props = {
  bookingId: string;
  listingId: string;
  labels: {
    title: string;
    placeholder: string;
    submit: string;
    success: string;
    error_rating: string;
  };
};

type State = { success?: boolean; error?: string } | null;

export default function ReviewForm({ bookingId, listingId, labels }: Props) {
  const [rating, setRating] = useState(0);
  const [state, action, isPending] = useActionState<State, FormData>(
    submitReview,
    null,
  );

  if (state?.success) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-3">
        <CheckCircle className="h-4 w-4 shrink-0" />
        {labels.success}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3 pt-3 border-t border-border">
      <p className="text-sm font-medium">{labels.title}</p>

      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="listing_id" value={listingId} />

      <StarPicker name="rating" defaultValue={rating} onChange={setRating} />

      <textarea
        name="comment"
        rows={3}
        placeholder={labels.placeholder}
        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
      >
        {isPending ? "…" : labels.submit}
      </button>
    </form>
  );
}

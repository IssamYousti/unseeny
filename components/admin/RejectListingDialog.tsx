"use client";

import { useState, useTransition } from "react";
import { rejectListing } from "@/app/(protected)/admin/actions";
import { X } from "lucide-react";

interface Props {
  listingId: string;
  listingTitle: string;
}

export default function RejectListingDialog({ listingId, listingTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await rejectListing(listingId, reason.trim() || undefined);
      setOpen(false);
      setReason("");
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-card border border-border text-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition"
      >
        Reject
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">Reject listing</h2>
                <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs">{listingTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition mt-0.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason for rejection <span className="text-muted-foreground font-normal">(shown to the host)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Pictures are not clear enough to confirm the listing is fully private. Please re-upload clearer photos showing the pool area and surrounding fence."
                  rows={4}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition disabled:opacity-50"
                >
                  {isPending ? "Rejecting…" : "Reject listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

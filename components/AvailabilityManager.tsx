"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { addBlockedPeriod, removeBlockedPeriod } from "@/app/(protected)/listings/manage/availability-actions";

type Period = {
  id: string;
  start_date: string;
  end_date: string;
};

type Props = {
  listingId: string;
  initialPeriods: Period[];
  labels: {
    title: string;
    start: string;
    end: string;
    add: string;
    empty: string;
    remove: string;
    error_dates: string;
  };
};

export default function AvailabilityManager({ listingId, initialPeriods, labels }: Props) {
  const [periods, setPeriods] = useState<Period[]>(initialPeriods);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  function handleAdd() {
    if (!startDate || !endDate || endDate < startDate) {
      setError(labels.error_dates);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addBlockedPeriod(listingId, startDate, endDate);
      if (result.error) {
        setError(result.error);
      } else if (result.period) {
        setPeriods((prev) => [...prev, result.period!]);
        setStartDate("");
        setEndDate("");
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeBlockedPeriod(id);
      if (!result.error) {
        setPeriods((prev) => prev.filter((p) => p.id !== id));
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">{labels.start}</label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            className="block bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">{labels.end}</label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            className="block bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {labels.add}
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Period list */}
      {periods.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <CalendarOff className="h-4 w-4" />
          {labels.empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {periods.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 bg-muted/50 rounded-xl px-4 py-2.5">
              <span className="text-sm">
                {p.start_date} → {p.end_date}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive transition disabled:opacity-40"
                aria-label={labels.remove}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

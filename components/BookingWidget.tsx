"use client";

import { useState, useActionState } from "react";
import { createBooking } from "@/app/(protected)/listings/[id]/actions";
import { DayPicker, type DateRange } from "react-day-picker";
import { Users, AlertCircle, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import "react-day-picker/style.css";

type UnavailablePeriod = { start: string; end: string };

type Props = {
  listingId: string;
  pricePerNight: number;
  maxGuests: number;
  unavailablePeriods?: UnavailablePeriod[];
  labels: {
    checkIn: string;
    checkOut: string;
    guests: string;
    perNight: string;
    requestBooking: string;
    noCharge: string;
    nights: string;
    total: string;
    selectDates: string;
    guestOf: string;
    unavailable_title: string;
  };
};

type ActionState = { error?: string } | null;

export default function BookingWidget({ listingId, pricePerNight, maxGuests, unavailablePeriods = [], labels }: Props) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);

  const [state, action, isPending] = useActionState<ActionState, FormData>(createBooking, null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build disabled date matchers
  const disabledDays = [
    { before: today },
    ...unavailablePeriods.map((p) => ({
      from: new Date(p.start),
      to: new Date(p.end),
    })),
  ];

  const checkIn = range?.from ? range.from.toISOString().split("T")[0] : "";
  const checkOut = range?.to ? range.to.toISOString().split("T")[0] : "";

  const nights =
    range?.from && range?.to
      ? Math.max(0, Math.floor((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

  const total = nights * pricePerNight;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">

      {/* Price */}
      <div className="text-2xl font-semibold">
        €{pricePerNight.toLocaleString()}
        <span className="text-muted-foreground text-base font-normal"> {labels.perNight}</span>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="listing_id" value={listingId} />
        <input type="hidden" name="guests_count" value={guests} />
        <input type="hidden" name="total_price" value={total.toFixed(2)} />
        <input type="hidden" name="check_in" value={checkIn} />
        <input type="hidden" name="check_out" value={checkOut} />

        {/* Calendar */}
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Selected range display */}
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{labels.checkIn}</p>
              <p className={`text-sm mt-0.5 ${checkIn ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
                {checkIn || "—"}
              </p>
            </div>
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{labels.checkOut}</p>
              <p className={`text-sm mt-0.5 ${checkOut ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
                {checkOut || "—"}
              </p>
            </div>
          </div>

          {/* Day picker */}
          <div className="p-3 rdp-unseeny">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={disabledDays}
              showOutsideDays={false}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left"
                    ? <ChevronLeft className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />,
              }}
            />
          </div>
        </div>

        {/* Unavailable periods legend */}
        {unavailablePeriods.filter((p) => p.end >= today.toISOString().split("T")[0]).length > 0 && (
          <div className="bg-muted/50 rounded-xl px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CalendarOff className="h-3 w-3" />
              {labels.unavailable_title}
            </p>
            <ul className="space-y-0.5">
              {unavailablePeriods
                .filter((p) => p.end >= today.toISOString().split("T")[0])
                .map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground">{p.start} → {p.end}</li>
                ))}
            </ul>
          </div>
        )}

        {/* Guests */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            {labels.guests}
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {labels.guests}</option>
            ))}
          </select>
        </div>

        {/* Optional message to host */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Message to host <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea
            name="guest_message"
            rows={3}
            placeholder="Introduce yourself or ask a question…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Price breakdown */}
        {nights > 0 && (
          <div className="bg-muted/50 rounded-xl px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>€{pricePerNight.toLocaleString()} × {nights} {labels.nights}</span>
              <span>€{total.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
              <span>{labels.total}</span>
              <span>€{total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {state?.error && (
          <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || nights === 0}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "…" : nights === 0 ? labels.selectDates : labels.requestBooking}
        </button>

        <p className="text-xs text-muted-foreground text-center">{labels.noCharge}</p>
      </form>
    </div>
  );
}

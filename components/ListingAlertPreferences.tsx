"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveNotificationPreferences, deleteNotificationPreferences } from "@/app/(protected)/listings/notify-actions";
import type { NotificationPreferences } from "@/app/(protected)/listings/notify-actions";
import { Bell, BellOff, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react";

type EquipmentItem = { key: string; name_en: string; category: string };

type Props = {
  initial: NotificationPreferences | null;
  equipmentItems: EquipmentItem[];
};

type SaveState = { success?: boolean; error?: string } | null;
type DeleteState = { success?: boolean; error?: string } | null;

// Amenity categories to surface for filtering (only the most booking-relevant ones)
const FILTER_CATEGORIES = [
  "outdoor_privacy",
  "outdoor_leisure",
  "bathroom",
  "bedroom_laundry",
  "kitchen_dining",
];

export default function ListingAlertPreferences({ initial, equipmentItems }: Props) {
  const [saveState, saveAction, isSaving] = useActionState<SaveState, FormData>(
    saveNotificationPreferences,
    null,
  );

  const [deleteState, deleteAction, isDeleting] = useActionState<DeleteState, FormData>(
    deleteNotificationPreferences,
    null,
  );

  const isSubscribed = initial !== null && !deleteState?.success;
  const [enabled, setEnabled] = useState(isSubscribed ? (initial?.is_active ?? true) : true);
  const [showAmenities, setShowAmenities] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((saveState || deleteState) && statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [saveState, deleteState]);

  const filterItems = equipmentItems.filter((i) =>
    FILTER_CATEGORIES.includes(i.category),
  );

  const selectedAmenities = initial?.amenities ?? [];

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/40" />

      <div className="px-6 pt-5 pb-1 border-b border-border/60 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Listing alerts
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get notified by email when new approved properties match your criteria.
          </p>
        </div>
        {isSubscribed && (
          <form action={deleteAction}>
            <button
              type="submit"
              disabled={isDeleting}
              className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition flex items-center gap-1"
              title="Unsubscribe from all alerts"
            >
              <BellOff className="h-3.5 w-3.5" />
              Unsubscribe
            </button>
          </form>
        )}
      </div>

      <form action={saveAction} className="p-6 space-y-5">

        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <div className="relative">
            <input
              type="checkbox"
              name="is_active"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
          </div>
          <span className="text-sm font-medium text-foreground">
            {enabled ? "Alerts enabled" : "Alerts paused"}
          </span>
        </label>

        {/* Filters — only shown when enabled */}
        {enabled && (
          <div className="space-y-5 pt-1">
            <p className="text-xs text-muted-foreground/70 -mt-2">
              Leave a filter empty to match any value.
            </p>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Countries
              </label>
              <input
                name="countries"
                defaultValue={(initial?.countries ?? []).join(", ")}
                placeholder="e.g. Netherlands, Belgium, Morocco"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <p className="text-[11px] text-muted-foreground/60 pl-0.5">
                Separate multiple countries with commas.
              </p>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Cities / regions
              </label>
              <input
                name="cities"
                defaultValue={(initial?.cities ?? []).join(", ")}
                placeholder="e.g. Amsterdam, Marrakech"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {/* Price + guests row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Max price per night
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-sm select-none">€</span>
                  <input
                    type="number"
                    name="max_price"
                    min={0}
                    step={10}
                    defaultValue={initial?.max_price ?? ""}
                    placeholder="No limit"
                    className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Min. guest capacity
                </label>
                <input
                  type="number"
                  name="min_guests"
                  min={1}
                  step={1}
                  defaultValue={initial?.min_guests ?? ""}
                  placeholder="Any size"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <p className="text-[11px] text-muted-foreground/60 pl-0.5">
                  Minimum number of guests the property can host.
                </p>
              </div>
            </div>

            {/* Amenities */}
            {filterItems.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAmenities((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
                >
                  Required equipment
                  {showAmenities ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {selectedAmenities.length > 0 && (
                    <span className="ml-1 bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      {selectedAmenities.length}
                    </span>
                  )}
                </button>
                <p className="text-[11px] text-muted-foreground/60">
                  Only notify me if the listing has at least one of the selected equipment items.
                </p>

                {showAmenities && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {filterItems.map((item) => (
                      <AmenityChip
                        key={item.key}
                        item={item}
                        defaultChecked={selectedAmenities.includes(item.key)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div ref={statusRef} className="flex items-center justify-between gap-4 pt-1">
          <div className="min-h-[1.5rem] flex items-center">
            {saveState?.success && (
              <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-left-2 duration-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Preferences saved
              </span>
            )}
            {(saveState?.error || deleteState?.error) && (
              <span className="flex items-center gap-2 text-sm text-destructive animate-in fade-in slide-in-from-left-2 duration-300">
                <AlertCircle className="h-3.5 w-3.5" />
                {saveState?.error ?? deleteState?.error}
              </span>
            )}
            {deleteState?.success && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in duration-300">
                <X className="h-3.5 w-3.5" />
                Unsubscribed from all alerts
              </span>
            )}
          </div>

          {!deleteState?.success && (
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Saving…
                </>
              ) : (
                isSubscribed ? "Save preferences" : "Subscribe"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Amenity chip (controlled checkbox styled as a pill) ───────────────────────

function AmenityChip({
  item,
  defaultChecked,
}: {
  item: EquipmentItem;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all select-none ${
        checked
          ? "bg-primary/10 border-primary/40 text-primary"
          : "bg-background border-border text-muted-foreground hover:border-primary/30"
      }`}
    >
      <input
        type="checkbox"
        name="amenities"
        value={item.key}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only"
      />
      {checked && <span className="text-[10px]">✓</span>}
      {item.name_en}
    </label>
  );
}

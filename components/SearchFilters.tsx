"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useRef, useState } from "react";
import { Search, Users, Euro, Calendar, X, SlidersHorizontal } from "lucide-react";

// The amenity keys that appear as quick-filter chips
const AMENITY_CHIPS = [
  "private_pool",
  "wifi",
  "parking",
  "prayer_room",
  "halal_kitchen",
  "no_cameras",
  "bbq",
  "ac",
] as const;

type Labels = {
  placeholder: string;
  guests: string;
  max_price: string;
  check_in: string;
  check_out: string;
  search: string;
  clear: string;
  amenities: string;
  amenity_labels: Record<string, string>;
};

export default function SearchFilters({ labels }: { labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const activeAmenities = searchParams.get("amenities")?.split(",").filter(Boolean) ?? [];
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(activeAmenities);

  const hasFilters =
    searchParams.has("q") ||
    searchParams.has("guests") ||
    searchParams.has("maxPrice") ||
    searchParams.has("checkIn") ||
    searchParams.has("checkOut") ||
    searchParams.has("amenities");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    const q = (fd.get("q") as string)?.trim();
    const guests = fd.get("guests") as string;
    const maxPrice = fd.get("maxPrice") as string;
    const checkIn = fd.get("checkIn") as string;
    const checkOut = fd.get("checkOut") as string;

    if (q) params.set("q", q);
    if (guests && Number(guests) > 1) params.set("guests", guests);
    if (maxPrice && Number(maxPrice) > 0) params.set("maxPrice", maxPrice);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearFilters() {
    formRef.current?.reset();
    setSelectedAmenities([]);
    startTransition(() => {
      router.push(pathname);
    });
  }

  function toggleAmenity(key: string) {
    setSelectedAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key],
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3"
    >
      <div className="flex flex-wrap gap-3 items-end">

        {/* Text search */}
        <div className="flex-1 min-w-[160px] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Search className="h-3 w-3" />
            {labels.placeholder}
          </label>
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder={labels.placeholder}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8"
            />
          </div>
        </div>

        {/* Guests */}
        <div className="w-28 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            {labels.guests}
          </label>
          <input
            type="number"
            name="guests"
            min={1}
            max={30}
            defaultValue={searchParams.get("guests") ?? ""}
            placeholder="Any"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Max price */}
        <div className="w-32 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Euro className="h-3 w-3" />
            {labels.max_price}
          </label>
          <input
            type="number"
            name="maxPrice"
            min={1}
            defaultValue={searchParams.get("maxPrice") ?? ""}
            placeholder="Any"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Check-in */}
        <div className="w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {labels.check_in}
          </label>
          <input
            type="date"
            name="checkIn"
            min={today}
            defaultValue={searchParams.get("checkIn") ?? ""}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          />
        </div>

        {/* Check-out */}
        <div className="w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {labels.check_out}
          </label>
          <input
            type="date"
            name="checkOut"
            min={today}
            defaultValue={searchParams.get("checkOut") ?? ""}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2 pb-0.5">
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            {labels.search}
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              disabled={isPending}
              className="flex items-center gap-1 border border-border text-muted-foreground px-3 py-2 rounded-lg text-sm hover:text-foreground hover:border-foreground/30 transition"
            >
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          )}
        </div>
      </div>

      {/* Amenity chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <SlidersHorizontal className="h-3 w-3" />
          {labels.amenities}:
        </span>
        {AMENITY_CHIPS.map((key) => {
          const active = selectedAmenities.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleAmenity(key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition
                ${active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
            >
              {labels.amenity_labels[key] ?? key}
            </button>
          );
        })}
      </div>

      {isPending && (
        <div className="h-0.5 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse w-1/2" />
        </div>
      )}
    </form>
  );
}

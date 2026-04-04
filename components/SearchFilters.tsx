"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useRef, useState } from "react";
import {
  Search, Users, Euro, X, SlidersHorizontal,
  MapPin, ChevronDown, Waves, Wifi, Car, Flame,
  Thermometer, Tv2, TreePine, Dumbbell, Wind,
  ShowerHead, UtensilsCrossed, Loader2,
} from "lucide-react";
import LocationAutocomplete, { type LocationSuggestion } from "@/components/LocationAutocomplete";

export type AmenityFilterItem = {
  key: string;
  name_en: string;
  category: string;
};

// Icon map for well-known amenity keys
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  private_pool:    <Waves className="h-3.5 w-3.5" />,
  indoor_pool:     <Waves className="h-3.5 w-3.5" />,
  wifi:            <Wifi className="h-3.5 w-3.5" />,
  private_parking: <Car className="h-3.5 w-3.5" />,
  bbq:             <Flame className="h-3.5 w-3.5" />,
  ac:              <Wind className="h-3.5 w-3.5" />,
  smart_tv:        <Tv2 className="h-3.5 w-3.5" />,
  private_garden:  <TreePine className="h-3.5 w-3.5" />,
  gym_indoor:      <Dumbbell className="h-3.5 w-3.5" />,
  gym_outdoor:     <Dumbbell className="h-3.5 w-3.5" />,
  sauna:           <Thermometer className="h-3.5 w-3.5" />,
  outdoor_jacuzzi: <ShowerHead className="h-3.5 w-3.5" />,
  indoor_jacuzzi:  <ShowerHead className="h-3.5 w-3.5" />,
  kitchen:         <UtensilsCrossed className="h-3.5 w-3.5" />,
};

// Human-readable category labels for grouping
const CATEGORY_LABELS: Record<string, string> = {
  exterior:           "Outdoor",
  internet_interior:  "Indoor",
  kitchen_dining:     "Kitchen",
  bedroom_laundry:    "Bedroom",
  heating_cooling:    "Climate",
  bathroom:           "Bathroom",
  home_safety:        "Safety",
  service:            "Service",
};

type Labels = {
  placeholder: string;
  location: string;
  guests: string;
  max_price: string;
  check_in: string;
  check_out: string;
  search: string;
  clear: string;
  amenities: string;
};

type Props = {
  labels: Labels;
  amenityItems: AmenityFilterItem[];
};

export default function SearchFilters({ labels, amenityItems }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const activeAmenities = searchParams.get("amenities")?.split(",").filter(Boolean) ?? [];
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(activeAmenities);
  const [, setLocationSuggestion] = useState<LocationSuggestion | null>(null);
  const [showMore, setShowMore] = useState(
    !!(searchParams.get("guests") || searchParams.get("maxPrice") || searchParams.get("amenities")),
  );

  const hasAnyFilter =
    searchParams.has("location") ||
    searchParams.has("guests") ||
    searchParams.has("maxPrice") ||
    searchParams.has("checkIn") ||
    searchParams.has("checkOut") ||
    searchParams.has("amenities");

  const secondaryCount = [
    searchParams.get("guests") && Number(searchParams.get("guests")) > 1,
    searchParams.get("maxPrice") && Number(searchParams.get("maxPrice")) > 0,
    activeAmenities.length > 0,
  ].filter(Boolean).length;

  // Group amenity items by category
  const grouped = amenityItems.reduce<Record<string, AmenityFilterItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    const location = (fd.get("location") as string)?.trim();
    const locationCity = (fd.get("locationCity") as string)?.trim();
    const locationCountry = (fd.get("locationCountry") as string)?.trim();
    const guests = fd.get("guests") as string;
    const maxPrice = fd.get("maxPrice") as string;
    const checkIn = fd.get("checkIn") as string;
    const checkOut = fd.get("checkOut") as string;

    if (location) params.set("location", location);
    if (locationCity) params.set("locationCity", locationCity);
    if (locationCountry) params.set("locationCountry", locationCountry);
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
    startTransition(() => router.push(pathname));
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
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      {/* ── Layer 1: primary search bar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 p-4">

        {/* Location */}
        <div className="flex-1 min-w-[180px] space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {labels.location}
          </label>
          <LocationAutocomplete
            placeholder={labels.placeholder}
            defaultLabel={searchParams.get("location") ?? ""}
            onChange={setLocationSuggestion}
          />
        </div>

        {/* Check-in */}
        <div className="w-36 space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {labels.check_in}
          </label>
          <input
            type="date"
            name="checkIn"
            min={today}
            defaultValue={searchParams.get("checkIn") ?? ""}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
          />
        </div>

        {/* Check-out */}
        <div className="w-36 space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {labels.check_out}
          </label>
          <input
            type="date"
            name="checkOut"
            min={today}
            defaultValue={searchParams.get("checkOut") ?? ""}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-end gap-2 shrink-0">
          <button
            type="submit"
            disabled={isPending}
            className="h-9 bg-primary text-primary-foreground px-5 rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Search className="h-3.5 w-3.5" />
            }
            {labels.search}
          </button>

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`relative h-9 flex items-center gap-1.5 border px-3 rounded-xl text-sm font-medium transition ${
              showMore || secondaryCount > 0
                ? "border-primary/40 text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {secondaryCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[1rem] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {secondaryCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMore ? "rotate-180" : ""}`} />
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearFilters}
              disabled={isPending}
              className="h-9 flex items-center gap-1 border border-border text-muted-foreground px-3 rounded-xl text-sm hover:text-destructive hover:border-destructive/30 transition"
            >
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          )}
        </div>
      </div>

      {/* ── Layer 2: secondary filters ─────────────────────────────────────── */}
      {showMore && (
        <div className="border-t border-border px-4 py-5 bg-muted/20 space-y-5">

          {/* Guests + price */}
          <div className="flex flex-wrap gap-4">
            <div className="w-36 space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="w-44 space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Euro className="h-3 w-3" />
                {labels.max_price}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-sm select-none">€</span>
                <input
                  type="number"
                  name="maxPrice"
                  min={1}
                  defaultValue={searchParams.get("maxPrice") ?? ""}
                  placeholder="No limit"
                  className="w-full bg-background border border-border rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>
          </div>

          {/* Amenity chips — grouped by category */}
          {amenityItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {labels.amenities}
              </p>

              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                    {CATEGORY_LABELS[category] ?? category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                      const active = selectedAmenities.includes(item.key);
                      const icon = AMENITY_ICONS[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleAmenity(item.key)}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {icon && <span className={active ? "opacity-90" : "opacity-50"}>{icon}</span>}
                          {item.name_en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {selectedAmenities.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedAmenities([])}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear amenity filters ({selectedAmenities.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {isPending && (
        <div className="h-0.5 bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary animate-[shimmer_1s_ease-in-out_infinite]" style={{ width: "60%" }} />
        </div>
      )}
    </form>
  );
}

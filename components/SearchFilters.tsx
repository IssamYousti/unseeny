"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useRef, useState } from "react";
import {
  Search, Users, X, SlidersHorizontal,
  MapPin, ChevronDown, Waves, Wifi, Car, Flame,
  Thermometer, Tv2, TreePine, Dumbbell, Wind,
  ShowerHead, UtensilsCrossed, Loader2, CalendarDays,
} from "lucide-react";
import LocationAutocomplete, { type LocationSuggestion } from "@/components/LocationAutocomplete";
import PriceRangeSlider from "@/components/PriceRangeSlider";

export type AmenityFilterItem = {
  key: string;
  name_en: string;
  category: string;
};

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

const CATEGORY_LABELS: Record<string, string> = {
  exterior:          "Outdoor",
  internet_interior: "Indoor",
  kitchen_dining:    "Kitchen",
  bedroom_laundry:   "Bedroom",
  heating_cooling:   "Climate",
  bathroom:          "Bathroom",
  home_safety:       "Safety",
  service:           "Service",
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
    !!(searchParams.get("guests") || searchParams.get("minPrice") || searchParams.get("maxPrice") || searchParams.get("amenities")),
  );

  const hasAnyFilter =
    searchParams.has("location") ||
    searchParams.has("guests") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice") ||
    searchParams.has("checkIn") ||
    searchParams.has("checkOut") ||
    searchParams.has("amenities");

  const secondaryCount = [
    searchParams.get("guests") && Number(searchParams.get("guests")) > 1,
    searchParams.get("minPrice") && Number(searchParams.get("minPrice")) > 0,
    searchParams.get("maxPrice") && Number(searchParams.get("maxPrice")) > 0,
    activeAmenities.length > 0,
  ].filter(Boolean).length;

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
    const minPrice = fd.get("minPrice") as string;
    const maxPrice = fd.get("maxPrice") as string;
    const checkIn = fd.get("checkIn") as string;
    const checkOut = fd.get("checkOut") as string;

    if (location) params.set("location", location);
    if (locationCity) params.set("locationCity", locationCity);
    if (locationCountry) params.set("locationCountry", locationCountry);
    if (guests && Number(guests) > 1) params.set("guests", guests);
    if (minPrice && Number(minPrice) > 0) params.set("minPrice", minPrice);
    if (maxPrice && Number(maxPrice) > 0) params.set("maxPrice", maxPrice);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));

    startTransition(() => router.push(`${pathname}?${params.toString()}`));
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
    <form ref={formRef} onSubmit={handleSubmit}>

      {/* ── Primary search bar — unified pill ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

        {/* Field row */}
        <div className="flex flex-col sm:flex-row sm:items-stretch divide-y sm:divide-y-0 sm:divide-x divide-border/60">

          {/* Location */}
          <div className="flex-1 px-4 py-3 min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
              <MapPin className="h-3 w-3" />
              {labels.location}
            </p>
            <LocationAutocomplete
              placeholder={labels.placeholder}
              defaultLabel={searchParams.get("location") ?? ""}
              onChange={setLocationSuggestion}
            />
          </div>

          {/* Date pair */}
          <div className="flex divide-x divide-border/60">
            {/* Check-in */}
            <div className="flex-1 sm:w-36 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
                <CalendarDays className="h-3 w-3" />
                {labels.check_in}
              </p>
              <input
                type="date"
                name="checkIn"
                min={today}
                defaultValue={searchParams.get("checkIn") ?? ""}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Check-out */}
            <div className="flex-1 sm:w-36 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
                <CalendarDays className="h-3 w-3" />
                {labels.check_out}
              </p>
              <input
                type="date"
                name="checkOut"
                min={today}
                defaultValue={searchParams.get("checkOut") ?? ""}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-3 py-3 bg-muted/20 sm:bg-transparent">
            {/* Search */}
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-primary/20 flex-1 sm:flex-none justify-center"
            >
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Search className="h-4 w-4" />
              }
              <span>{labels.search}</span>
            </button>

            {/* Filters toggle */}
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                showMore || secondaryCount > 0
                  ? "bg-primary/8 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/40"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {secondaryCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[1rem] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {secondaryCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMore ? "rotate-180" : ""}`} />
            </button>

            {/* Clear */}
            {hasAnyFilter && (
              <button
                type="button"
                onClick={clearFilters}
                disabled={isPending}
                title={labels.clear}
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Loading bar */}
        {isPending && (
          <div className="h-0.5 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all duration-500"
              style={{ animation: "shimmer 1.2s ease-in-out infinite" }}
            />
          </div>
        )}
      </div>

      {/* ── Secondary filters panel ────────────────────────────────────────── */}
      {showMore && (
        <div className="mt-2 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-5 space-y-6">

            {/* Guests + price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Guests */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">{labels.guests}</span>
                </div>
                <input
                  type="number"
                  name="guests"
                  min={1}
                  max={30}
                  defaultValue={searchParams.get("guests") ?? ""}
                  placeholder="Any number of guests"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Price range */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                    €
                  </div>
                  <span className="text-sm font-semibold">{labels.max_price}</span>
                </div>
                <PriceRangeSlider
                  label=""
                  defaultMin={searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined}
                  defaultMax={searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined}
                />
              </div>
            </div>

            {/* Amenities */}
            {amenityItems.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{labels.amenities}</p>
                  {selectedAmenities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAmenities([])}
                      className="text-xs text-muted-foreground hover:text-destructive transition flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Clear ({selectedAmenities.length})
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
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
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-medium transition-all duration-150 ${
                                active
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-[1.02]"
                                  : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground hover:bg-primary/5"
                              }`}
                            >
                              {icon && (
                                <span className={active ? "opacity-90" : "opacity-40"}>{icon}</span>
                              )}
                              {item.name_en}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

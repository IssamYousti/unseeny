"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Star,
  MapPin,
  Users,
  BedDouble,
  Bath,
  CheckCircle2,
  X,
  ArrowLeftRight,
  Sparkles,
  Lock,
} from "lucide-react";
import FavouriteButton from "@/components/FavouriteButton";

export type FavListing = {
  id: string;
  title: string;
  city: string;
  country: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities_count: number;
  cover_image_url: string | null;
  avg_rating: number | null;
  review_count: number;
  host_name: string;
  host_languages: string[];
};

type Row = {
  label: string;
  getValue: (l: FavListing) => string | number | null;
  format?: (v: string | number | null) => string;
  higherIsBetter?: boolean;
  lowerIsBetter?: boolean;
};

const ROWS: Row[] = [
  {
    label: "Price / night",
    getValue: (l) => l.price_per_night,
    format: (v) => (v !== null ? `€${v}` : "—"),
    lowerIsBetter: true,
  },
  {
    label: "Location",
    getValue: (l) => `${l.city}, ${l.country}`,
    format: (v) => String(v ?? "—"),
  },
  {
    label: "Max guests",
    getValue: (l) => l.max_guests,
    format: (v) => (v !== null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    label: "Bedrooms",
    getValue: (l) => l.bedrooms,
    format: (v) => (v !== null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    label: "Bathrooms",
    getValue: (l) => l.bathrooms,
    format: (v) => (v !== null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    label: "Rating",
    getValue: (l) => l.avg_rating,
    format: (v) => (v !== null ? `${(v as number).toFixed(1)} / 5` : "No reviews"),
    higherIsBetter: true,
  },
  {
    label: "Reviews",
    getValue: (l) => l.review_count,
    format: (v) => (v !== null ? String(v) : "0"),
    higherIsBetter: true,
  },
  {
    label: "Amenities",
    getValue: (l) => l.amenities_count,
    format: (v) => (v !== null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    label: "Host",
    getValue: (l) => l.host_name,
    format: (v) => String(v ?? "—"),
  },
  {
    label: "Languages",
    getValue: (l) => (l.host_languages.length > 0 ? l.host_languages.join(", ") : null),
    format: (v) => String(v ?? "—"),
  },
];

function getWinner(row: Row, a: FavListing, b: FavListing): "a" | "b" | null {
  if (!row.higherIsBetter && !row.lowerIsBetter) return null;
  const va = row.getValue(a);
  const vb = row.getValue(b);
  if (va === null || vb === null || va === vb) return null;
  if (typeof va !== "number" || typeof vb !== "number") return null;
  if (row.higherIsBetter) return va > vb ? "a" : "b";
  if (row.lowerIsBetter) return va < vb ? "a" : "b";
  return null;
}

export default function FavouritesClient({ listings }: { listings: FavListing[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // slide window
      return [...prev, id];
    });
  }

  const compareListings = selected.length === 2
    ? ([
        listings.find((l) => l.id === selected[0])!,
        listings.find((l) => l.id === selected[1])!,
      ] as [FavListing, FavListing])
    : null;

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="h-16 w-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
          <Heart className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">No saved properties yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tap the heart icon on any listing to save it here.
          </p>
        </div>
        <Link
          href="/listings"
          className="mt-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition"
        >
          Browse properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved properties</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {listings.length} {listings.length === 1 ? "property" : "properties"} saved
          </p>
        </div>

        {listings.length >= 2 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-full px-4 py-2">
            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
            {selected.length === 0
              ? "Select two properties to compare"
              : selected.length === 1
              ? "Select one more to compare"
              : "Scroll down to see comparison"}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const isSelected = selected.includes(listing.id);
          const selIndex = selected.indexOf(listing.id);

          return (
            <div
              key={listing.id}
              className={`relative group bg-card border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? "border-primary shadow-md shadow-primary/10"
                  : "border-border hover:-translate-y-0.5"
              }`}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/20 via-secondary to-accent/10 overflow-hidden">
                {listing.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.cover_image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-background/60 border border-border flex items-center justify-center">
                      <Lock className="h-5 w-5 text-primary/70" />
                    </div>
                  </div>
                )}

                {/* Compare selection badge */}
                <button
                  onClick={() => toggleSelect(listing.id)}
                  title={isSelected ? "Deselect" : "Select to compare"}
                  className={`absolute top-3 left-3 h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground scale-110"
                      : "bg-background/80 backdrop-blur-sm border-white/30 text-transparent hover:border-primary hover:text-primary"
                  }`}
                >
                  {isSelected ? (
                    <span className="text-[11px] font-bold">{selIndex + 1}</span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </button>

                {/* Favourite button */}
                <div className="absolute top-3 right-3">
                  <FavouriteButton listingId={listing.id} initialFavourite={true} />
                </div>
              </div>

              {/* Content */}
              <Link href={`/listings/${listing.id}`} className="block p-4 space-y-1.5">
                <h3 className="font-semibold leading-tight text-sm group-hover:text-primary transition-colors truncate">
                  {listing.title}
                </h3>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {listing.city}, {listing.country}
                </div>

                {listing.avg_rating !== null && (
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{listing.avg_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({listing.review_count})</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{listing.max_guests}</span>
                  <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{listing.bedrooms}</span>
                  <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{listing.bathrooms}</span>
                  <span className="ml-auto font-semibold text-foreground text-sm">€{listing.price_per_night}<span className="font-normal text-muted-foreground text-xs"> /night</span></span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* ── Comparison table ───────────────────────────────────────────── */}
      {compareListings && (
        <div className="rounded-3xl border border-primary/20 bg-card shadow-xl shadow-primary/5 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Side-by-side comparison</p>
                <p className="text-xs text-muted-foreground">Green highlights indicate the better value</p>
              </div>
            </div>
            <button
              onClick={() => setSelected([])}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Listing titles */}
          <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border">
            <div className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground" />
            {compareListings.map((l, i) => (
              <div key={l.id} className={`px-6 py-4 border-l border-border ${i === 0 ? "bg-muted/20" : ""}`}>
                <div className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{l.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.city}, {l.country}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison rows */}
          {ROWS.map((row, rowIdx) => {
            const [a, b] = compareListings;
            const winner = getWinner(row, a, b);
            const valA = row.format ? row.format(row.getValue(a)) : String(row.getValue(a) ?? "—");
            const valB = row.format ? row.format(row.getValue(b)) : String(row.getValue(b) ?? "—");

            return (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_1fr_1fr] border-b border-border/60 last:border-0 ${
                  rowIdx % 2 === 0 ? "" : "bg-muted/10"
                }`}
              >
                {/* Label */}
                <div className="px-6 py-3.5 flex items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {row.label}
                  </span>
                </div>

                {/* Value A */}
                <div
                  className={`px-6 py-3.5 border-l border-border/60 flex items-center gap-2 ${
                    winner === "a" ? "bg-emerald-500/8 dark:bg-emerald-500/10" : ""
                  }`}
                >
                  <span className={`text-sm font-medium ${winner === "a" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                    {valA}
                  </span>
                  {winner === "a" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>

                {/* Value B */}
                <div
                  className={`px-6 py-3.5 border-l border-border/60 flex items-center gap-2 ${
                    winner === "b" ? "bg-emerald-500/8 dark:bg-emerald-500/10" : ""
                  }`}
                >
                  <span className={`text-sm font-medium ${winner === "b" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                    {valB}
                  </span>
                  {winner === "b" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}

          {/* CTA row */}
          <div className="grid grid-cols-[1fr_1fr_1fr] bg-muted/20">
            <div className="px-6 py-4" />
            {compareListings.map((l) => (
              <div key={l.id} className="px-6 py-4 border-l border-border">
                <Link
                  href={`/listings/${l.id}`}
                  className="w-full flex items-center justify-center bg-primary text-primary-foreground py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
                >
                  View listing
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

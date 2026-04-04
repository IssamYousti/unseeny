"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, Archive } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  city: string;
  country: string;
  price_per_night: number;
  is_approved: boolean;
  is_archived?: boolean;
};

type Filter = "all" | "live" | "pending" | "archived";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  live: "Live",
  pending: "Pending",
  archived: "Archived",
};

export default function HostListingsGrid({ listings }: { listings: Listing[] }) {
  const hasArchived = listings.some((l) => l.is_archived);

  const [filter, setFilter] = useState<Filter>("all");

  const filtered = listings.filter((l) => {
    if (filter === "all") return !l.is_archived;
    if (filter === "live") return l.is_approved && !l.is_archived;
    if (filter === "pending") return !l.is_approved && !l.is_archived;
    if (filter === "archived") return l.is_archived;
    return true;
  });

  const counts: Record<Filter, number> = {
    all: listings.filter((l) => !l.is_archived).length,
    live: listings.filter((l) => l.is_approved && !l.is_archived).length,
    pending: listings.filter((l) => !l.is_approved && !l.is_archived).length,
    archived: listings.filter((l) => l.is_archived).length,
  };

  const filters: Filter[] = hasArchived
    ? ["all", "live", "pending", "archived"]
    : ["all", "live", "pending"];

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {FILTER_LABELS[f]}
            {counts[f] > 0 && (
              <span className={`ml-1.5 ${filter === f ? "opacity-70" : "opacity-50"}`}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-2xl">
          No {filter === "all" ? "" : FILTER_LABELS[filter].toLowerCase()} listings.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((l) => (
            <div
              key={l.id}
              className={`bg-card border rounded-2xl p-5 flex items-start justify-between gap-3 hover:border-primary/30 transition ${
                l.is_archived ? "opacity-60 border-border/50" : "border-border"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{l.title}</p>
                  {l.is_archived && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      <Archive className="h-2.5 w-2.5" />
                      Archived
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{l.city}, {l.country}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-medium">€{l.price_per_night}</span>
                  <span className="text-xs text-muted-foreground">/ night</span>
                  <span className="text-muted-foreground/40">·</span>
                  {l.is_archived ? (
                    <span className="text-xs font-medium text-muted-foreground">Archived</span>
                  ) : l.is_approved ? (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live</span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</span>
                  )}
                </div>
              </div>
              <Link
                href={`/listings/manage/${l.id}`}
                className="text-xs text-muted-foreground hover:text-primary transition shrink-0 flex items-center gap-1 pt-0.5"
              >
                <PenLine className="h-3.5 w-3.5" />
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

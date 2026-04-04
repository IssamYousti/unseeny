"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import type { EquipmentItem } from "./EquipmentPicker";

const CATEGORY_LABELS: Record<string, string> = {
  bathroom:          "Bathroom",
  bedroom_laundry:   "Bedroom & Laundry",
  heating_cooling:   "Heating & Cooling",
  home_safety:       "Home Safety",
  internet_interior: "Internet & Interior",
  kitchen_dining:    "Kitchen & Dining",
  service:           "Service",
  exterior:          "Exterior",
};

const CATEGORY_ORDER = [
  "exterior",
  "bedroom_laundry",
  "bathroom",
  "kitchen_dining",
  "internet_interior",
  "heating_cooling",
  "home_safety",
  "service",
];

const INITIAL_VISIBLE = 10;

interface Props {
  selected: string[];
  allItems: EquipmentItem[];
  locale?: string;
  sectionTitle?: string;
}

function getLocaleName(item: EquipmentItem, locale = "en") {
  if (locale === "nl") return item.name_nl;
  if (locale === "fr") return item.name_fr;
  return item.name_en;
}

export default function EquipmentDisplay({
  selected,
  allItems,
  locale = "en",
  sectionTitle = "What this villa offers",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [notIncludedExpanded, setNotIncludedExpanded] = useState(false);

  const selectedSet = new Set(selected);

  // Sort included items by display_order (most important first)
  const includedItems = allItems
    .filter((i) => selectedSet.has(i.key))
    .sort((a, b) => a.display_order - b.display_order);

  const notIncludedItems = allItems
    .filter((i) => !selectedSet.has(i.key))
    .sort((a, b) => a.display_order - b.display_order);

  const visibleIncluded = expanded ? includedItems : includedItems.slice(0, INITIAL_VISIBLE);
  const hiddenCount = includedItems.length - INITIAL_VISIBLE;

  if (includedItems.length === 0) return null;

  // Group visible included items by category for display
  const grouped = CATEGORY_ORDER.reduce<Record<string, EquipmentItem[]>>((acc, cat) => {
    const catItems = visibleIncluded
      .filter((i) => i.category === cat)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{sectionTitle}</h2>

      {/* Included equipment, grouped by category */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {CATEGORY_LABELS[category] ?? category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6">
              {catItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{getLocaleName(item, locale)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Show more / less */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm font-medium underline underline-offset-2 text-foreground hover:text-primary transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show {hiddenCount} more {hiddenCount === 1 ? "item" : "items"}
            </>
          )}
        </button>
      )}

      {/* Not included section */}
      {notIncludedItems.length > 0 && (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setNotIncludedExpanded(!notIncludedExpanded)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {notIncludedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Not included ({notIncludedItems.length} items)
          </button>

          {notIncludedExpanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6">
              {notIncludedItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  <span>{getLocaleName(item, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

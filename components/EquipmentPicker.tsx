// Server component — no "use client" needed, just HTML checkboxes

export type EquipmentItem = {
  id: string;
  key: string;
  category: string;
  name_en: string;
  name_nl: string;
  name_fr: string;
  sort_order: number;
  display_order: number;
};

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

interface Props {
  items: EquipmentItem[];
  selected?: string[];
  locale?: string; // 'en' | 'nl' | 'fr'
}

function getLocaleName(item: EquipmentItem, locale = "en") {
  if (locale === "nl") return item.name_nl;
  if (locale === "fr") return item.name_fr;
  return item.name_en;
}

export default function EquipmentPicker({ items, selected = [], locale = "en" }: Props) {
  const selectedSet = new Set(selected);

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, EquipmentItem[]>>((acc, cat) => {
    const catItems = items
      .filter((i) => i.category === cat)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border">
            {CATEGORY_LABELS[category] ?? category}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {catItems.map((item) => {
              const checked = selectedSet.has(item.key);
              return (
                <label
                  key={item.key}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors text-sm
                    ${checked
                      ? "border-primary/60 bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                    }`}
                >
                  <input
                    type="checkbox"
                    name="amenities"
                    value={item.key}
                    defaultChecked={checked}
                    className="accent-primary h-4 w-4 shrink-0"
                  />
                  <span className="leading-snug">{getLocaleName(item, locale)}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

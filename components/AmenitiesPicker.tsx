"use client";

export const AMENITIES = [
  { key: "private_pool" },
  { key: "private_garden" },
  { key: "ac" },
  { key: "wifi" },
  { key: "parking" },
  { key: "bbq" },
  { key: "kitchen" },
  { key: "outdoor_dining" },
  { key: "washing_machine" },
  { key: "baby_cot" },
  { key: "no_cameras" },
  { key: "prayer_room" },
  { key: "halal_kitchen" },
  { key: "gym" },
  { key: "sauna" },
  { key: "ev_charger" },
] as const;

type AmenityKey = (typeof AMENITIES)[number]["key"];

type Props = {
  selected?: string[];
  labels: Record<AmenityKey, string> & { section_title: string };
};

export default function AmenitiesPicker({ selected = [], labels }: Props) {
  const selectedSet = new Set(selected);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {AMENITIES.map(({ key }) => {
        const checked = selectedSet.has(key);
        return (
          <label
            key={key}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors text-sm
              ${checked
                ? "border-primary/60 bg-primary/5 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/30"
              }`}
          >
            <input
              type="checkbox"
              name="amenities"
              value={key}
              defaultChecked={checked}
              className="accent-primary h-4 w-4 shrink-0"
            />
            {labels[key as AmenityKey]}
          </label>
        );
      })}
    </div>
  );
}

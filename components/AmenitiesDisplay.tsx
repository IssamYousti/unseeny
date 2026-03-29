const AMENITY_ICONS: Record<string, string> = {
  private_pool: "🏊",
  private_garden: "🌿",
  ac: "❄️",
  wifi: "📶",
  parking: "🚗",
  bbq: "🔥",
  kitchen: "🍳",
  outdoor_dining: "🍽️",
  washing_machine: "🫧",
  baby_cot: "👶",
  no_cameras: "📵",
  prayer_room: "🕌",
  halal_kitchen: "✅",
  gym: "💪",
  sauna: "🧖",
  ev_charger: "⚡",
};

type Props = {
  amenities: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ta: (key: string) => string;
  sectionTitle: string;
};

export default function AmenitiesDisplay({ amenities, ta, sectionTitle }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{sectionTitle}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {amenities.map((key) => (
          <div
            key={key}
            className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-3 py-2.5 text-sm"
          >
            <span className="text-base" aria-hidden>{AMENITY_ICONS[key] ?? "✓"}</span>
            <span>{ta(key)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

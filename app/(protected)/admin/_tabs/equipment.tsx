import { unstable_noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminToggleEquipment,
  adminAddEquipment,
  adminDeleteEquipment,
} from "../actions";

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

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default async function Equipment() {
  unstable_noStore();

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("equipment_items")
    .select("*")
    .order("category")
    .order("sort_order");

  // Group by category
  const grouped: Record<string, typeof items> = {};
  for (const item of items ?? []) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Equipment items</h1>

      {/* Add new item */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold mb-4">Add new equipment item</h2>
        <form action={adminAddEquipment} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key (unique)</label>
            <input
              name="key"
              required
              placeholder="e.g. pool_table"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
            <select
              name="category"
              required
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name (EN) *</label>
            <input
              name="name_en"
              required
              placeholder="Pool table"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name (NL)</label>
            <input
              name="name_nl"
              placeholder="Poolbiljart"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name (FR)</label>
            <input
              name="name_fr"
              placeholder="Baby-foot"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              Add item
            </button>
          </div>
        </form>
      </div>

      {/* Items grouped by category */}
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm">{CATEGORY_LABELS[category] ?? category}</h2>
          </div>
          <div className="divide-y divide-border">
            {(catItems ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name_en}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    key: <code className="font-mono">{item.key}</code>
                    {item.name_nl !== item.name_en && <> · NL: {item.name_nl}</>}
                    {item.name_fr !== item.name_en && <> · FR: {item.name_fr}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle active/inactive */}
                  <form action={adminToggleEquipment.bind(null, item.id, !item.is_active)}>
                    <button
                      type="submit"
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        item.is_active
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={adminDeleteEquipment.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="text-xs text-muted-foreground hover:text-destructive transition px-2 py-1 rounded hover:bg-destructive/10"
                      title="Delete permanently"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

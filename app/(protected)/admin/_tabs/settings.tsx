import { unstable_noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { DEFAULT_CONFIG } from "@/lib/platform-config";
import { CheckCircle2, Percent, Plus, Trash2, GripVertical } from "lucide-react";

// ── Server actions ──────────────────────────────────────────────────────────

async function savePlatformConfig(formData: FormData) {
  "use server";
  const admin = createAdminClient();
  const hostFeePct = Math.min(1, Math.max(0, Number(formData.get("host_fee_pct")) / 100));
  const guestMarkupPct = Math.min(1, Math.max(0, Number(formData.get("guest_markup_pct")) / 100));
  await admin
    .from("platform_config")
    .upsert({ id: "default", host_fee_pct: hostFeePct, guest_markup_pct: guestMarkupPct, updated_at: new Date().toISOString() })
    .eq("id", "default");
  revalidatePath("/admin");
}

async function addTermsSection(formData: FormData) {
  "use server";
  const admin = createAdminClient();
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!title || !content) return;
  const { data: existing } = await admin.from("terms_sections").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
  await admin.from("terms_sections").insert({ title, content, sort_order: nextOrder });
  revalidatePath("/admin");
  revalidatePath("/terms");
}

async function deleteTermsSection(id: string) {
  "use server";
  const admin = createAdminClient();
  await admin.from("terms_sections").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/terms");
}

async function updateTermsSection(formData: FormData) {
  "use server";
  const admin = createAdminClient();
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!id || !title || !content) return;
  await admin.from("terms_sections").update({ title, content, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/terms");
}

// ── Component ───────────────────────────────────────────────────────────────

export default async function Settings() {
  unstable_noStore();
  const admin = createAdminClient();

  const [{ data: configRow }, { data: sections }] = await Promise.all([
    admin.from("platform_config").select("host_fee_pct, guest_markup_pct").eq("id", "default").maybeSingle(),
    admin.from("terms_sections").select("*").order("sort_order", { ascending: true }),
  ]);

  const cfg = configRow ?? DEFAULT_CONFIG;
  const hostFeeDisplay = Math.round(Number(cfg.host_fee_pct) * 100 * 100) / 100;
  const guestMarkupDisplay = Math.round(Number(cfg.guest_markup_pct) * 100 * 100) / 100;

  return (
    <div className="space-y-10 max-w-2xl">

      {/* ── Platform fee config ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Platform fees</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Applied to every booking. Guest pays <strong>base + markup</strong>; host receives <strong>base − host fee</strong>.
          </p>
        </div>

        <form action={savePlatformConfig} className="bg-card border border-border rounded-2xl p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Percent className="h-3 w-3" /> Host fee (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="host_fee_pct"
                  min={0}
                  max={100}
                  step={0.1}
                  defaultValue={hostFeeDisplay}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 pr-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground/60">Deducted from the host's base price</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Percent className="h-3 w-3" /> Guest markup (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="guest_markup_pct"
                  min={0}
                  max={100}
                  step={0.1}
                  defaultValue={guestMarkupDisplay}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 pr-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground/60">Added on top for the guest</p>
            </div>
          </div>

          {/* Example simulation */}
          <div className="bg-muted/30 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Example at current rates (€100 base):</p>
            <p>Guest pays: <strong className="text-foreground">€{(100 * (1 + Number(cfg.guest_markup_pct))).toFixed(2)}</strong></p>
            <p>Host receives: <strong className="text-foreground">€{(100 * (1 - Number(cfg.host_fee_pct))).toFixed(2)}</strong></p>
            <p>Platform earns: <strong className="text-primary">€{(100 * (Number(cfg.guest_markup_pct) + Number(cfg.host_fee_pct))).toFixed(2)}</strong></p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              Save fee settings
            </button>
          </div>
        </form>
      </section>

      {/* ── Terms & Conditions ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Terms &amp; Conditions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sections appear on the public <code className="text-xs bg-muted px-1 rounded">/terms</code> page in sort order.
          </p>
        </div>

        {/* Existing sections */}
        {(sections ?? []).length > 0 && (
          <div className="space-y-3">
            {(sections ?? []).map((s) => (
              <details key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden group">
                <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer list-none hover:bg-muted/30 transition">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <span className="flex-1 font-medium text-sm">{s.title}</span>
                  <span className="text-xs text-muted-foreground">#{s.sort_order}</span>
                </summary>
                <div className="border-t border-border px-5 py-4">
                  <form action={updateTermsSection} className="space-y-3">
                    <input type="hidden" name="id" value={s.id} />
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <input
                        name="title"
                        defaultValue={s.title}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Content</label>
                      <textarea
                        name="content"
                        defaultValue={s.content}
                        rows={4}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <form action={deleteTermsSection.bind(null, s.id)}>
                        <button type="submit" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition">
                          <Trash2 className="h-3.5 w-3.5" /> Delete section
                        </button>
                      </form>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}

        {/* Add new section */}
        <form action={addTermsSection} className="bg-muted/20 border border-dashed border-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Add new section
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Section title</label>
            <input
              name="title"
              required
              placeholder="e.g. Booking & Cancellation"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Content</label>
            <textarea
              name="content"
              required
              rows={4}
              placeholder="Write the section content…"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add section
          </button>
        </form>
      </section>

    </div>
  );
}

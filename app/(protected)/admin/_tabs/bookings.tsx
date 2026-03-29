import { unstable_noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { adminConfirmBooking, adminRejectBooking } from "../actions";

type Props = { status?: string };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground border-border";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default async function Bookings({ status }: Props) {
  unstable_noStore();

  const [supabase, t] = await Promise.all([createClient(), getTranslations("admin")]);

  const query = supabase
    .from("bookings")
    .select("id, guest_id, host_id, listing_id, check_in, check_out, total_price, status, created_at, listings(title, city)")
    .order("created_at", { ascending: false });

  const { data: bookings } = status && status !== "all"
    ? await query.eq("status", status)
    : await query;

  // Collect unique user IDs
  const userIds = new Set<string>();
  for (const b of bookings ?? []) {
    userIds.add(b.guest_id);
    userIds.add(b.host_id);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", Array.from(userIds));

  const profileMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p);
  }

  const userName = (id: string) => {
    const p = profileMap.get(id);
    if (!p) return id.slice(0, 8) + "…";
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || id.slice(0, 8) + "…";
  };

  const filterTabs = [
    { key: "all", label: t("filter_all") },
    { key: "pending", label: t("filter_pending") },
    { key: "approved", label: t("filter_approved") },
    { key: "confirmed", label: t("filter_confirmed") },
    { key: "rejected", label: t("filter_rejected") },
    { key: "cancelled", label: t("filter_cancelled") },
  ];

  const activeFilter = status ?? "all";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("bookings_title")}</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((f) => {
          const href = f.key === "all" ? "/admin?tab=bookings" : `/admin?tab=bookings&status=${f.key}`;
          const isActive = activeFilter === f.key;
          return (
            <Link
              key={f.key}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {!bookings || bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10">{t("no_data")}</p>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">{t("col_title")}</th>
                  <th className="text-left px-4 py-3">{t("col_guest")}</th>
                  <th className="text-left px-4 py-3">{t("col_host")}</th>
                  <th className="text-left px-4 py-3">{t("col_dates")}</th>
                  <th className="text-left px-4 py-3">{t("col_amount")}</th>
                  <th className="text-left px-4 py-3">{t("col_status")}</th>
                  <th className="text-left px-4 py-3">{t("col_created")}</th>
                  <th className="text-left px-4 py-3">{t("col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const listing = b.listings as unknown as { title?: string; city?: string } | null;
                  return (
                    <tr key={b.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div>{listing?.title ?? "—"}</div>
                        {listing?.city && (
                          <div className="text-xs text-muted-foreground">{listing.city}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{userName(b.guest_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{userName(b.host_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(b.check_in).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" → "}
                        {new Date(b.check_out).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        €{(b.total_price ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(b.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {b.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <form action={adminConfirmBooking.bind(null, b.id)}>
                              <button className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                                {t("admin_confirm")}
                              </button>
                            </form>
                            <form action={adminRejectBooking.bind(null, b.id)}>
                              <button className="bg-card border border-border text-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition">
                                {t("admin_reject")}
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

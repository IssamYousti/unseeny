import { unstable_noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { approveListing } from "../actions";
import RejectListingDialog from "@/components/admin/RejectListingDialog";

type Props = { status?: string };

function StatusBadge({ approved, rejected }: { approved: boolean; rejected?: boolean }) {
  if (approved) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        Approved
      </span>
    );
  }
  if (rejected) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      Pending
    </span>
  );
}

export default async function Listings({ status }: Props) {
  unstable_noStore();

  const [supabase, t] = await Promise.all([createClient(), getTranslations("admin")]);

  let listingsQuery = supabase
    .from("listings")
    .select("id, title, city, country, price_per_night, host_id, is_approved, is_rejected, created_at")
    .order("created_at", { ascending: false });

  if (status === "pending") {
    listingsQuery = listingsQuery.eq("is_approved", false);
  } else if (status === "approved") {
    listingsQuery = listingsQuery.eq("is_approved", true);
  }

  const { data: listings } = await listingsQuery;

  // Fetch host profiles
  const hostIds = [...new Set((listings ?? []).map((l) => l.host_id))];
  const { data: hostProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", hostIds);

  const hostMap = new Map<string, string>();
  for (const p of hostProfiles ?? []) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id.slice(0, 8) + "…";
    hostMap.set(p.id, name);
  }

  // Booking counts per listing
  const listingIds = (listings ?? []).map((l) => l.id);
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("listing_id")
    .in("listing_id", listingIds);

  const bookingCountMap = new Map<string, number>();
  for (const b of allBookings ?? []) {
    bookingCountMap.set(b.listing_id, (bookingCountMap.get(b.listing_id) ?? 0) + 1);
  }

  // Average ratings per listing
  const { data: reviews } = await supabase
    .from("reviews")
    .select("listing_id, rating")
    .in("listing_id", listingIds);

  const ratingMap = new Map<string, { sum: number; count: number }>();
  for (const r of reviews ?? []) {
    const cur = ratingMap.get(r.listing_id) ?? { sum: 0, count: 0 };
    ratingMap.set(r.listing_id, { sum: cur.sum + r.rating, count: cur.count + 1 });
  }

  const filterTabs = [
    { key: "all", label: t("filter_all") },
    { key: "pending", label: t("filter_pending") },
    { key: "approved", label: t("status_approved") },
  ];

  const activeFilter = status ?? "all";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("listings_title")}</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((f) => {
          const href = f.key === "all" ? "/admin?tab=listings" : `/admin?tab=listings&status=${f.key}`;
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

      {!listings || listings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10">{t("no_data")}</p>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm min-w-[480px]">
              <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">{t("col_title")}</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">{t("col_host")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">{t("col_city")}</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">{t("col_country")}</th>
                  <th className="text-left px-4 py-3">{t("col_price")}</th>
                  <th className="text-left px-4 py-3">{t("col_status")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">{t("col_bookings_count")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">{t("col_rating")}</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">{t("col_created")}</th>
                  <th className="text-left px-4 py-3">{t("col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const ratingData = ratingMap.get(l.id);
                  const avgRating = ratingData
                    ? (ratingData.sum / ratingData.count).toFixed(1)
                    : null;
                  const bookingCount = bookingCountMap.get(l.id) ?? 0;

                  return (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[140px] sm:max-w-[200px]">
                        <div className="truncate">{l.title}</div>
                        <div className="text-xs text-muted-foreground md:hidden truncate">
                          {[l.city, l.country].filter(Boolean).join(", ")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {hostMap.get(l.host_id) ?? l.host_id.slice(0, 8) + "…"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{l.city ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{l.country ?? "—"}</td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {l.price_per_night != null ? `€${l.price_per_night}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge approved={l.is_approved} rejected={l.is_rejected} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums hidden md:table-cell">
                        {bookingCount > 0 ? bookingCount : <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {avgRating ? (
                          <span className="flex items-center gap-1">
                            <span className="text-amber-400">★</span>
                            {avgRating}
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                        {new Date(l.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/listings/${l.id}`}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition"
                          >
                            View
                          </Link>
                          {!l.is_approved && (
                            <form action={approveListing.bind(null, l.id)}>
                              <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition">
                                {t("approve_listing")}
                              </button>
                            </form>
                          )}
                          <RejectListingDialog listingId={l.id} listingTitle={l.title} />
                        </div>
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

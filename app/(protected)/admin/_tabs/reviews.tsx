import { unstable_noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { adminDeleteReview } from "../actions";
import { Trash2 } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-muted-foreground/30"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function Reviews() {
  unstable_noStore();

  const [supabase, t] = await Promise.all([createClient(), getTranslations("admin")]);

  const [
    { data: listingReviews },
    { data: guestReviews },
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, reviewer_id, listing_id, rating, comment, created_at, listings(title)")
      .order("created_at", { ascending: false }),
    supabase
      .from("guest_reviews")
      .select("id, host_id, guest_id, rating, comment, created_at")
      .order("created_at", { ascending: false }),
  ]);

  // Collect all user IDs needed
  const userIds = new Set<string>();
  for (const r of listingReviews ?? []) userIds.add(r.reviewer_id);
  for (const r of guestReviews ?? []) {
    userIds.add(r.host_id);
    userIds.add(r.guest_id);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", Array.from(userIds));

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id.slice(0, 8) + "…";
    profileMap.set(p.id, name);
  }

  const userName = (id: string) => profileMap.get(id) ?? id.slice(0, 8) + "…";

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">{t("reviews_title")}</h1>

      {/* Listing Reviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("reviews_listing_section")}</h2>

        {!listingReviews || listingReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">{t("no_data")}</p>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">{t("col_reviewer")}</th>
                    <th className="text-left px-4 py-3">{t("col_subject")}</th>
                    <th className="text-left px-4 py-3">{t("col_rating")}</th>
                    <th className="text-left px-4 py-3">{t("col_comment")}</th>
                    <th className="text-left px-4 py-3">{t("col_date")}</th>
                    <th className="text-left px-4 py-3">{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {listingReviews.map((r) => {
                    const listing = r.listings as unknown as { title?: string } | null;
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{userName(r.reviewer_id)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {listing?.title ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StarRating rating={r.rating} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[280px]">
                          <p className="truncate">{r.comment ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <form action={adminDeleteReview.bind(null, r.id, "listing")}>
                            <button
                              className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs font-medium transition-colors"
                              title={t("delete_review")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("delete_review")}
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Guest Reviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("reviews_guest_section")}</h2>

        {!guestReviews || guestReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">{t("no_data")}</p>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">{t("col_host")}</th>
                    <th className="text-left px-4 py-3">{t("col_guest")}</th>
                    <th className="text-left px-4 py-3">{t("col_rating")}</th>
                    <th className="text-left px-4 py-3">{t("col_comment")}</th>
                    <th className="text-left px-4 py-3">{t("col_date")}</th>
                    <th className="text-left px-4 py-3">{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {guestReviews.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{userName(r.host_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{userName(r.guest_id)}</td>
                      <td className="px-4 py-3">
                        <StarRating rating={r.rating} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[280px]">
                        <p className="truncate">{r.comment ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <form action={adminDeleteReview.bind(null, r.id, "guest")}>
                          <button
                            className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs font-medium transition-colors"
                            title={t("delete_review")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("delete_review")}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

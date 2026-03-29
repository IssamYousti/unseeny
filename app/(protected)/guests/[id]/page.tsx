import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Star, CalendarDays, UserCircle } from "lucide-react";
import { notFound } from "next/navigation";

async function GuestProfile({ id }: { id: string }) {
  const [supabase, t] = await Promise.all([createClient(), getTranslations("guestProfile")]);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: stayData }, { data: guestReviews }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id")
      .eq("guest_id", id)
      .eq("status", "confirmed"),
    supabase
      .from("guest_reviews")
      .select("rating, comment, created_at, host_id")
      .eq("guest_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) notFound();

  const firstName = profile.first_name || "";
  const lastName = profile.last_name || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || t("anonymous_host");
  const memberYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;
  const confirmedStays = stayData?.length ?? 0;

  const ratings = (guestReviews ?? []).map((r) => r.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;

  // Fetch host profiles for reviewer names
  const hostIds = [...new Set((guestReviews ?? []).map((r) => r.host_id))];
  const { data: hostProfiles } = hostIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", hostIds)
    : { data: [] };

  const hostMap = Object.fromEntries(
    (hostProfiles ?? []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || t("anonymous_host")])
  );

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
            </div>
            {memberYear && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("member_since")} {memberYear}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {confirmedStays === 1 ? t("stay_single") : t("stay_plural")}
              </span>
            </div>
            <p className="text-2xl font-semibold">{confirmedStays}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{t("avg_rating")}</span>
            </div>
            {avgRating != null ? (
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-semibold">{avgRating.toFixed(1)}</p>
                <span className="text-sm text-muted-foreground">/ 5</span>
                <span className="text-xs text-muted-foreground">({ratings.length})</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Reviews from hosts */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">{t("reviews_title")}</h2>
          {!guestReviews || guestReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reviews_empty")}</p>
          ) : (
            <div className="space-y-3">
              {guestReviews.map((review, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {(hostMap[review.host_id] ?? t("anonymous_host")).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{hostMap[review.host_id] ?? t("anonymous_host")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${s < review.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <GuestProfile id={params.id} />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Home,
  MessageCircle,
  Timer,
  CalendarDays,
  Languages,
  Star,
  MapPin,
} from "lucide-react";
import { computeHostMetrics, computeHostingYears, formatResponseTime } from "@/lib/host-metrics";

async function HostProfile({ id }: { id: string }) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: role },
    { data: listings },
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).maybeSingle(),
    admin.from("roles").select("is_approved_host").eq("user_id", id).maybeSingle(),
    admin
      .from("listings")
      .select("id, title, city, country, price_per_night, is_approved, created_at, amenities")
      .eq("host_id", id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile || !role?.is_approved_host) notFound();

  // Fetch reviews for this host's listings
  const approvedListingIds = (listings ?? []).map((l) => l.id);
  const { data: listingReviews } = approvedListingIds.length > 0
    ? await admin
        .from("reviews")
        .select("rating, comment, created_at, reviewer_id, listing_id")
        .in("listing_id", approvedListingIds)
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: [] };

  const reviewerIds = [...new Set((listingReviews ?? []).map((r) => r.reviewer_id))];
  const { data: reviewerProfiles } = reviewerIds.length > 0
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", reviewerIds)
    : { data: [] };

  const reviewerMap = new Map(
    (reviewerProfiles ?? []).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || "Guest",
    ]),
  );

  const listingTitleMap = new Map((listings ?? []).map((l) => [l.id, l.title]));

  // Metrics
  const metrics = await computeHostMetrics(id);
  const firstListingDate = (listings ?? []).length > 0
    ? (listings ?? [])[(listings ?? []).length - 1].created_at
    : null;
  const hostingYears = computeHostingYears(profile.hosting_since, firstListingDate);

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Host";
  const initial = displayName.charAt(0).toUpperCase();
  const memberYear = new Date(profile.created_at).getFullYear();

  const ratings = (listingReviews ?? []).map((r) => r.rating);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-14 space-y-10">

        {/* ── Host identity card ─────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary/60 via-primary to-primary/40" />

          <div className="p-8 space-y-6">
            {/* Header row */}
            <div className="flex items-start gap-6 flex-wrap sm:flex-nowrap">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-3xl font-bold text-primary select-none">
                  {initial}
                </div>
                <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                  <Home className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                    <p className="text-xs text-muted-foreground mt-1">Member since {memberYear}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full bg-primary text-primary-foreground shrink-0">
                    <Home className="h-3.5 w-3.5" />
                    Host
                  </span>
                </div>

                {/* Rating summary */}
                {avgRating !== null && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < Math.round(avgRating)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({ratings.length} {ratings.length === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics strip */}
            <div className="grid grid-cols-3 gap-3">
              <MetricTile
                icon={<CalendarDays className="h-4 w-4" />}
                label="Years hosting"
                value={hostingYears !== null ? (hostingYears < 1 ? "< 1" : String(hostingYears)) : "—"}
              />
              <MetricTile
                icon={<MessageCircle className="h-4 w-4" />}
                label="Response rate"
                value={metrics.responseRate !== null ? `${metrics.responseRate}%` : "—"}
              />
              <MetricTile
                icon={<Timer className="h-4 w-4" />}
                label="Responds"
                value={formatResponseTime(metrics.avgResponseHours)}
                small
              />
            </div>

            {/* Languages */}
            {(profile.languages ?? []).length > 0 && (
              <div className="flex items-start gap-3">
                <Languages className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {(profile.languages as string[]).map((lang: string) => (
                    <span
                      key={lang}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-muted border border-border"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {profile.host_bio && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {profile.host_bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Properties ─────────────────────────────────────────────────── */}
        {(listings ?? []).length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold">
              Properties{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({(listings ?? []).length})
              </span>
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              {(listings ?? []).map((l) => (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-3 group hover:border-primary/30 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm group-hover:text-primary transition truncate">
                      {l.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">
                        {l.city}, {l.country}
                      </p>
                    </div>
                    <p className="text-sm font-medium mt-2">
                      €{l.price_per_night}
                      <span className="text-xs font-normal text-muted-foreground"> / night</span>
                    </p>
                  </div>
                  <div className="text-primary opacity-0 group-hover:opacity-100 transition text-xs font-medium shrink-0 pt-0.5">
                    View →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Reviews ────────────────────────────────────────────────────── */}
        {(listingReviews ?? []).length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold">
              Guest reviews{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({(listingReviews ?? []).length})
              </span>
            </h2>

            <div className="space-y-3">
              {(listingReviews ?? []).map((review, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold shrink-0">
                        {(reviewerMap.get(review.reviewer_id) ?? "G").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {reviewerMap.get(review.reviewer_id) ?? "Guest"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          re: {listingTitleMap.get(review.listing_id) ?? "Property"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA if not logged in */}
        {!user && (
          <div className="bg-card border border-border rounded-2xl px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to contact {profile.first_name ?? "this host"} or book one of their properties.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/auth/sign-up"
                className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
              >
                Sign up free
              </Link>
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

function MetricTile({
  icon,
  label,
  value,
  small,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="bg-muted/40 border border-border rounded-2xl px-4 py-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-bold text-foreground ${small ? "text-base leading-tight" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <HostProfileWrapper params={params} />
    </Suspense>
  );
}

async function HostProfileWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HostProfile id={id} />;
}

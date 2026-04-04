import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Lock, Star, ArrowRight, Home, MessageCircle, Timer, CalendarDays, Languages } from "lucide-react";
import { getListingImageUrl } from "@/lib/data/listings";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import BookingWidget from "@/components/BookingWidget";
import ReviewList from "@/components/ReviewList";
import EquipmentDisplay from "@/components/EquipmentDisplay";
import FavouriteButton from "@/components/FavouriteButton";
import PropertyRulesDisplay from "@/components/PropertyRulesDisplay";
import CancellationPolicyDisplay from "@/components/CancellationPolicyDisplay";
import { computeHostMetrics, computeHostingYears, formatResponseTime } from "@/lib/host-metrics";

/** Shown to unauthenticated visitors instead of the full booking widget */
function LoginToBookPanel({
  pricePerNight,
  listingId,
}: {
  pricePerNight: number;
  listingId: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      <div className="text-2xl font-semibold">
        €{pricePerNight.toLocaleString()}
        <span className="text-muted-foreground text-base font-normal"> / night</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Create a free account to check availability, see exact dates and request a booking.
      </p>

      <div className="space-y-2.5">
        <Link
          href={`/auth/sign-up`}
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:opacity-90 transition"
        >
          Sign up — it&apos;s free
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/auth/login`}
          className="flex items-center justify-center w-full border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition"
        >
          Already have an account? Sign in
        </Link>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        No payment required to request a booking.
      </p>
    </div>
  );
}

async function ListingDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [supabase, t] = await Promise.all([
    createClient(),
    getTranslations("listingDetail"),
  ]);

  // Get user — no redirect, just check auth state
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) return <p className="p-10">{t("not_found")}</p>;

  const today = new Date().toISOString().split("T")[0];

  // Check if this listing is favourited by the current user
  const { data: favRow } = user
    ? await supabase
        .from("listing_favourites")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", params.id)
        .maybeSingle()
    : { data: null };
  const isFavourite = !!favRow;

  const admin = createAdminClient();
  const [{ data: imageRows }, { data: reviews }, { data: bookedPeriods }, { data: blockedPeriods }, { data: equipmentItems }, { data: hostProfile }] = await Promise.all([
    supabase
      .from("listing_images")
      .select("storage_path, position")
      .eq("listing_id", params.id)
      .order("position", { ascending: true }),
    supabase
      .from("reviews")
      .select("rating")
      .eq("listing_id", params.id),
    supabase
      .from("bookings")
      .select("check_in, check_out")
      .eq("listing_id", params.id)
      .in("status", ["confirmed", "pending"])
      .gte("check_out", today),
    supabase
      .from("blocked_periods")
      .select("start_date, end_date")
      .eq("listing_id", params.id)
      .gte("end_date", today)
      .order("start_date", { ascending: true }),
    supabase
      .from("equipment_items")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order"),
    admin
      .from("profiles")
      .select("id, first_name, last_name, host_bio, languages, hosting_since")
      .eq("id", data.host_id)
      .maybeSingle(),
  ]);

  // Host metrics
  const hostMetrics = data.host_id ? await computeHostMetrics(data.host_id) : null;
  const hostListingsResult = data.host_id
    ? await admin.from("listings").select("created_at").eq("host_id", data.host_id).eq("is_approved", true).order("created_at", { ascending: true }).limit(1)
    : null;
  const firstListingDate = hostListingsResult?.data?.[0]?.created_at ?? null;
  const hostingYears = hostProfile
    ? computeHostingYears(hostProfile.hosting_since, firstListingDate)
    : null;

  const unavailablePeriods = [
    ...(bookedPeriods ?? []).map((b) => ({ start: b.check_in, end: b.check_out })),
    ...(blockedPeriods ?? []).map((b) => ({ start: b.start_date, end: b.end_date })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const images = (imageRows ?? []).map((img) => getListingImageUrl(img.storage_path));

  const reviewCount = reviews?.length ?? 0;
  const avgRating = reviewCount > 0
    ? (reviews!.reduce((s, r) => s + r.rating, 0) / reviewCount)
    : null;

  const bookingLabels = {
    checkIn: t("check_in"),
    checkOut: t("check_out"),
    guests: t("guests"),
    perNight: t("price_per_night"),
    requestBooking: t("request_booking"),
    noCharge: t("no_charge"),
    nights: t("nights"),
    total: t("total"),
    selectDates: t("select_dates"),
    guestOf: t("guest_of"),
  };

  const reviewListLabels = {
    title: t("reviews_title"),
    no_reviews: t("reviews_empty"),
    anonymous: t("reviews_anonymous"),
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* TITLE */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 bg-accent/10 text-accent border border-accent/30 text-xs font-medium px-3 py-1 rounded-full">
              <Lock className="h-3 w-3" />
              {t("verified_badge")}
            </span>
            {avgRating != null && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  · {reviewCount} {reviewCount === 1 ? t("review_count_single") : t("review_count_plural")}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{data.title}</h1>
            {user && (
              <div className="shrink-0 mt-1">
                <FavouriteButton
                  listingId={data.id}
                  initialFavourite={isFavourite}
                  size="md"
                />
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-2">{data.city}, {data.country}</p>
        </section>

        {/* IMAGES */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-secondary to-accent/10">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0]} alt={data.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground/60">
                No photos yet
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-secondary to-muted">
                {images[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[i]} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* CONTENT + BOOKING */}
        <section className="grid lg:grid-cols-[1fr_350px] gap-12">

          <div className="space-y-8">
            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("about")}</h2>
              {data.descr ? (
                data.descr.startsWith("<") ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: data.descr }}
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{data.descr}</p>
                )
              ) : (
                <p className="text-muted-foreground">{t("no_description")}</p>
              )}
            </div>

            {/* Details */}
            <div>
              <h2 className="text-xl font-semibold mb-4">{t("details")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-muted-foreground text-sm">{t("guests")}</p>
                  <p className="font-medium">{data.max_guests}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("bedrooms")}</p>
                  <p className="font-medium">{data.bedrooms}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("bathrooms")}</p>
                  <p className="font-medium">{data.bathrooms}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("location")}</h2>
              <p className="text-muted-foreground">{data.city}, {data.country}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t("location_private")}</p>
            </div>

            {/* Equipment */}
            {data.amenities && data.amenities.length > 0 && equipmentItems && (
              <EquipmentDisplay
                selected={data.amenities}
                allItems={equipmentItems}
                sectionTitle="What this villa offers"
              />
            )}

            {/* Property rules */}
            <div className="border border-border rounded-2xl p-6">
              <PropertyRulesDisplay listingId={data.id} />
            </div>

            {/* Cancellation policy */}
            <div className="border border-border rounded-2xl p-6">
              <CancellationPolicyDisplay listingId={data.id} />
            </div>

            {/* Meet your host */}
            {hostProfile && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Meet your host</h2>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary select-none">
                        {([hostProfile.first_name, hostProfile.last_name].filter(Boolean).join(" ") || "H").charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Home className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base">
                        {[hostProfile.first_name, hostProfile.last_name].filter(Boolean).join(" ") || "Host"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Home className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Host</span>
                      </div>
                    </div>

                    <Link
                      href={`/hosts/${hostProfile.id}`}
                      className="text-xs font-medium text-primary hover:underline shrink-0"
                    >
                      View profile →
                    </Link>
                  </div>

                  {/* Mini metrics */}
                  {hostMetrics && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/40 rounded-xl px-3 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <CalendarDays className="h-3 w-3" />
                          <span className="text-xs">Hosting</span>
                        </div>
                        <p className="text-base font-bold">
                          {hostingYears !== null ? (hostingYears < 1 ? "< 1 yr" : `${hostingYears} yr${hostingYears !== 1 ? "s" : ""}`) : "—"}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-xl px-3 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <MessageCircle className="h-3 w-3" />
                          <span className="text-xs">Response</span>
                        </div>
                        <p className="text-base font-bold">
                          {hostMetrics.responseRate !== null ? `${hostMetrics.responseRate}%` : "—"}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-xl px-3 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Timer className="h-3 w-3" />
                          <span className="text-xs">Replies</span>
                        </div>
                        <p className="text-sm font-bold leading-tight">
                          {formatResponseTime(hostMetrics.avgResponseHours)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {(hostProfile.languages ?? []).length > 0 && (
                    <div className="flex items-start gap-2">
                      <Languages className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1.5">
                        {(hostProfile.languages as string[]).map((lang: string) => (
                          <span key={lang} className="text-xs px-2.5 py-0.5 rounded-full bg-muted border border-border">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {hostProfile.host_bio && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {hostProfile.host_bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reviews */}
            <ReviewList listingId={data.id} labels={reviewListLabels} />
          </div>

          {/* Booking sidebar */}
          <aside className="h-fit sticky top-24">
            {user ? (
              <BookingWidget
                listingId={data.id}
                pricePerNight={data.price_per_night}
                maxGuests={data.max_guests}
                unavailablePeriods={unavailablePeriods}
                labels={bookingLabels}
              />
            ) : (
              <LoginToBookPanel
                pricePerNight={data.price_per_night}
                listingId={data.id}
              />
            )}
          </aside>

        </section>
      </div>
    </main>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <ListingDetail params={props.params} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Lock, Star } from "lucide-react";
import { getListingImageUrl } from "@/lib/data/listings";
import { getTranslations } from "next-intl/server";
import BookingWidget from "@/components/BookingWidget";
import ReviewList from "@/components/ReviewList";
import AmenitiesDisplay from "@/components/AmenitiesDisplay";

async function ListingDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [supabase, t, ta] = await Promise.all([
    createClient(),
    getTranslations("listingDetail"),
    getTranslations("amenities"),
  ]);

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) return <p className="p-10">{t("not_found")}</p>;

  const today = new Date().toISOString().split("T")[0];

  const [{ data: imageRows }, { data: reviews }, { data: bookedPeriods }, { data: blockedPeriods }] = await Promise.all([
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
  ]);

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
    unavailable_title: t("unavailable_title"),
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

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{data.title}</h1>
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
                {t("no_description")}
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
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("about")}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {data.descr || t("no_description")}
              </p>
            </div>

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

            <div>
              <h2 className="text-xl font-semibold mb-3">{t("location")}</h2>
              <p className="text-muted-foreground">{data.city}, {data.country}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t("location_private")}</p>
            </div>

            {/* AMENITIES */}
            {data.amenities && data.amenities.length > 0 && (
              <AmenitiesDisplay amenities={data.amenities} ta={ta} sectionTitle={ta("section_title")} />
            )}

            {/* REVIEWS */}
            <ReviewList listingId={data.id} labels={reviewListLabels} />
          </div>

          {/* BOOKING WIDGET */}
          <aside className="h-fit sticky top-24">
            <BookingWidget
              listingId={data.id}
              pricePerNight={data.price_per_night}
              maxGuests={data.max_guests}
              unavailablePeriods={unavailablePeriods}
              labels={bookingLabels}
            />
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

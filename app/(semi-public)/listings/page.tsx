import { Suspense } from "react";
import ListingCard from "@/components/ListingCard";
import SearchFilters, { type AmenityFilterItem } from "@/components/SearchFilters";
import NotifyBanner from "@/components/NotifyBanner";
import ListingsMap from "@/components/ListingsMap";
import type { MapListing } from "@/components/ListingsMap";
import { getApprovedListings, type ListingFilters } from "@/lib/data/listings";
import { createClient } from "@/lib/supabase/server";
import { Lock, Eye, Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";

type SearchParams = {
  location?: string;
  locationCity?: string;
  locationCountry?: string;
  locationLat?: string;
  locationLon?: string;
  q?: string;
  guests?: string;
  minPrice?: string;
  maxPrice?: string;
  checkIn?: string;
  checkOut?: string;
  amenities?: string;
};

async function ListingsLoader({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const authUser = (await supabase.auth.getUser()).data.user;
  const userEmail = authUser?.email ?? undefined;

  const [listings, t, subscriptionCheck, favouritesResult, equipmentResult] = await Promise.all([
    getApprovedListings({
      locationCity: searchParams.locationCity,
      locationCountry: searchParams.locationCountry,
      query: searchParams.q,
      guests: searchParams.guests ? Number(searchParams.guests) : undefined,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      checkIn: searchParams.checkIn,
      checkOut: searchParams.checkOut,
      amenities: searchParams.amenities?.split(",").filter(Boolean),
    } satisfies ListingFilters),
    getTranslations("listings"),
    userEmail
      ? supabase.from("listing_notifications").select("email").eq("email", userEmail).maybeSingle()
      : Promise.resolve({ data: null }),
    authUser
      ? supabase.from("listing_favourites").select("listing_id").eq("user_id", authUser.id)
      : Promise.resolve({ data: null }),
    // Fetch top amenities for filter chips — sorted by display_order (most relevant first)
    supabase
      .from("equipment_items")
      .select("key, name_en, category")
      .eq("is_active", true)
      .lte("display_order", 15)
      .order("display_order", { ascending: true }),
  ]);

  const favouriteIds = new Set((favouritesResult.data ?? []).map((f) => f.listing_id));
  const isSubscribed = !!subscriptionCheck.data;

  const hasActiveFilters =
    searchParams.location ||
    searchParams.locationCity ||
    searchParams.locationCountry ||
    searchParams.q ||
    searchParams.guests ||
    searchParams.minPrice ||
    searchParams.maxPrice ||
    searchParams.checkIn ||
    searchParams.checkOut ||
    searchParams.amenities;

  // Listings that have geocoordinates — shown on map
  const mapListings: MapListing[] = listings
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
      title: l.title,
      city: l.city,
      country: l.country,
      price_per_night: l.price_per_night,
      latitude: l.latitude as number,
      longitude: l.longitude as number,
      cover_image_url: l.cover_image_url ?? null,
      avg_rating: l.avg_rating ?? null,
      review_count: l.review_count ?? 0,
    }));

  const amenityItems: AmenityFilterItem[] = (equipmentResult.data ?? []).map((e) => ({
    key: e.key,
    name_en: e.name_en,
    category: e.category,
  }));

  const filterLabels = {
    placeholder: t("filter_placeholder"),
    location: t("filter_location"),
    guests: t("filter_guests"),
    max_price: t("filter_max_price"),
    check_in: t("filter_check_in"),
    check_out: t("filter_check_out"),
    search: t("filter_search"),
    clear: t("filter_clear"),
    amenities: t("filter_amenities"),
  };

  return (
    <main className="bg-background min-h-screen">

      {/* HERO */}
      <section className="border-b border-border bg-secondary/40">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
            {t("headline")}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-lg">
            {t("description")}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <span className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
              <Lock className="h-3 w-3" /> {t("badge_pool")}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
              <Eye className="h-3 w-3" /> {t("badge_neighbours")}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
              <Shield className="h-3 w-3" /> {t("badge_verified")}
            </span>
          </div>
        </div>
      </section>

      {/* SEARCH FILTERS */}
      <section className="max-w-4xl mx-auto px-6 pt-8">
        <SearchFilters labels={filterLabels} amenityItems={amenityItems} />
      </section>

      {/* MAP — only shown when a location filter is active */}
      {(searchParams.locationCity || searchParams.locationCountry) && mapListings.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pt-6">
          <div className="h-64 sm:h-80 rounded-2xl overflow-hidden border border-border shadow-sm">
            <ListingsMap
              listings={mapListings}
              center={
                searchParams.locationLat && searchParams.locationLon
                  ? [Number(searchParams.locationLat), Number(searchParams.locationLon)]
                  : undefined
              }
              zoom={searchParams.locationLat ? 10 : undefined}
            />
          </div>
        </section>
      )}

      {/* RESULTS */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        {listings.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold">
              {hasActiveFilters ? t("no_results_title") : t("empty_title")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {hasActiveFilters ? t("no_results_desc") : t("empty_desc")}
            </p>
          </div>
        ) : (
          <>
            {hasActiveFilters && (
              <p className="text-sm text-muted-foreground mb-6">
                {listings.length}{" "}
                {listings.length === 1 ? t("result_single") : t("result_plural")}
              </p>
            )}
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isFavourite={authUser ? favouriteIds.has(listing.id) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* NOTIFY BANNER */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <NotifyBanner defaultEmail={userEmail} isSubscribed={isSubscribed} />
      </section>

    </main>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <ListingsLoaderWrapper searchParams={searchParams} />
    </Suspense>
  );
}

async function ListingsLoaderWrapper({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return <ListingsLoader searchParams={params} />;
}

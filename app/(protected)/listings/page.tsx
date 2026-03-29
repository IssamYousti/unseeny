import { Suspense } from "react";
import ListingCard from "@/components/ListingCard";
import SearchFilters from "@/components/SearchFilters";
import NotifyBanner from "@/components/NotifyBanner";
import { getApprovedListings, type ListingFilters } from "@/lib/data/listings";
import { createClient } from "@/lib/supabase/server";
import { Lock, Eye, Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";

type SearchParams = {
  q?: string;
  guests?: string;
  maxPrice?: string;
  checkIn?: string;
  checkOut?: string;
  amenities?: string;
};

async function ListingsLoader({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const userEmail = (await supabase.auth.getUser()).data.user?.email ?? undefined;

  const [listings, t, ta, subscriptionCheck] = await Promise.all([
    getApprovedListings({
      query: searchParams.q,
      guests: searchParams.guests ? Number(searchParams.guests) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      checkIn: searchParams.checkIn,
      checkOut: searchParams.checkOut,
      amenities: searchParams.amenities?.split(",").filter(Boolean),
    } satisfies ListingFilters),
    getTranslations("listings"),
    getTranslations("amenities"),
    userEmail
      ? supabase.from("listing_notifications").select("email").eq("email", userEmail).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isSubscribed = !!subscriptionCheck.data;

  const hasActiveFilters =
    searchParams.q ||
    searchParams.guests ||
    searchParams.maxPrice ||
    searchParams.checkIn ||
    searchParams.checkOut ||
    searchParams.amenities;

  const filterLabels = {
    placeholder: t("filter_placeholder"),
    guests: t("filter_guests"),
    max_price: t("filter_max_price"),
    check_in: t("filter_check_in"),
    check_out: t("filter_check_out"),
    search: t("filter_search"),
    clear: t("filter_clear"),
    amenities: t("filter_amenities"),
    amenity_labels: {
      private_pool: ta("private_pool"),
      wifi: ta("wifi"),
      parking: ta("parking"),
      prayer_room: ta("prayer_room"),
      halal_kitchen: ta("halal_kitchen"),
      no_cameras: ta("no_cameras"),
      bbq: ta("bbq"),
      ac: ta("ac"),
    },
  };

  return (
    <main className="min-h-screen bg-background">

      {/* HERO */}
      <section className="border-b border-border bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6 py-16">
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
      <section className="max-w-6xl mx-auto px-6 pt-8">
        <SearchFilters labels={filterLabels} />
      </section>

      {/* RESULTS */}
      <section className="max-w-6xl mx-auto px-6 py-8">
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
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* NOTIFY BANNER */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
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

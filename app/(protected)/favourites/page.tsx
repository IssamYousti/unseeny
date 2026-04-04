import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { unstable_noStore } from "next/cache";
import { getListingImageUrl } from "@/lib/data/listings";
import FavouritesClient, { type FavListing } from "./FavouritesClient";

async function FavouritesPage() {
  unstable_noStore();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // 1. Get favourite listing IDs (ordered by when they were saved)
  const { data: favs } = await supabase
    .from("listing_favourites")
    .select("listing_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const listingIds = (favs ?? []).map((f) => f.listing_id);

  if (listingIds.length === 0) {
    return (
      <main className="bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <FavouritesClient listings={[]} />
        </div>
      </main>
    );
  }

  const admin = createAdminClient();

  // 2. Fetch listings + related data in parallel
  const [
    { data: listings },
    { data: imageRows },
    { data: reviews },
  ] = await Promise.all([
    admin
      .from("listings")
      .select(
        "id, title, city, country, price_per_night, max_guests, bedrooms, bathrooms, amenities, host_id",
      )
      .in("id", listingIds),
    admin
      .from("listing_images")
      .select("listing_id, storage_path, position")
      .in("listing_id", listingIds)
      .order("position", { ascending: true }),
    admin.from("reviews").select("listing_id, rating").in("listing_id", listingIds),
  ]);

  // 3. Fetch host profiles
  const hostIds = [...new Set((listings ?? []).map((l) => l.host_id))];
  const { data: hostProfiles } =
    hostIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, first_name, last_name, languages")
          .in("id", hostIds)
      : { data: [] };

  // 4. Build maps
  const coverMap = new Map<string, string>();
  for (const img of imageRows ?? []) {
    if (!coverMap.has(img.listing_id)) {
      coverMap.set(img.listing_id, getListingImageUrl(img.storage_path));
    }
  }

  const ratingsMap = new Map<string, number[]>();
  for (const r of reviews ?? []) {
    if (!ratingsMap.has(r.listing_id)) ratingsMap.set(r.listing_id, []);
    ratingsMap.get(r.listing_id)!.push(r.rating);
  }

  const hostMap = new Map(
    (hostProfiles ?? []).map((p) => [
      p.id,
      {
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Host",
        languages: (p.languages as string[]) ?? [],
      },
    ]),
  );

  // 5. Enrich listings, preserving favourite order
  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]));
  const enriched: FavListing[] = listingIds
    .map((id) => {
      const l = listingMap.get(id);
      if (!l) return null;

      const ratings = ratingsMap.get(l.id) ?? [];
      const avg_rating =
        ratings.length > 0
          ? ratings.reduce((s, r) => s + r, 0) / ratings.length
          : null;
      const host = hostMap.get(l.host_id) ?? { name: "Host", languages: [] };

      return {
        id: l.id,
        title: l.title,
        city: l.city,
        country: l.country,
        price_per_night: l.price_per_night,
        max_guests: l.max_guests ?? 0,
        bedrooms: l.bedrooms ?? 0,
        bathrooms: l.bathrooms ?? 0,
        amenities_count: (l.amenities as string[] | null)?.length ?? 0,
        cover_image_url: coverMap.get(l.id) ?? null,
        avg_rating,
        review_count: ratings.length,
        host_name: host.name,
        host_languages: host.languages,
      } satisfies FavListing;
    })
    .filter((x): x is FavListing => x !== null);

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <FavouritesClient listings={enriched} />
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <FavouritesPage />
    </Suspense>
  );
}

import { createClient } from "@/lib/supabase/server";
import { unstable_noStore } from "next/cache";

export function getListingImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/listing-images/${storagePath}`;
}

export type ListingFilters = {
  query?: string;       // searches title, city, country
  guests?: number;      // minimum capacity required
  maxPrice?: number;    // maximum price per night
  checkIn?: string;     // ISO date — filter out unavailable listings
  checkOut?: string;    // ISO date — filter out unavailable listings
  amenities?: string[]; // listing must have ALL of these amenities
};

export async function getApprovedListings(filters: ListingFilters = {}) {
  unstable_noStore();

  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("*")
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  // Text search across title, city, country
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim();
    query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%,country.ilike.%${q}%`);
  }

  // Minimum guest capacity
  if (filters.guests && filters.guests > 1) {
    query = query.gte("max_guests", filters.guests);
  }

  // Maximum price per night
  if (filters.maxPrice && filters.maxPrice > 0) {
    query = query.lte("price_per_night", filters.maxPrice);
  }

  // Amenity filter — listing must contain ALL selected amenities
  if (filters.amenities && filters.amenities.length > 0) {
    query = query.contains("amenities", filters.amenities);
  }

  const { data: listings, error } = await query;
  if (error) throw new Error(error.message);
  if (!listings) return [];

  // Date availability filter — exclude listings with overlapping confirmed/pending bookings or blocked periods
  let unavailableIds = new Set<string>();
  if (filters.checkIn && filters.checkOut && filters.checkIn < filters.checkOut) {
    const [{ data: conflicting }, { data: blocked }] = await Promise.all([
      supabase
        .from("bookings")
        .select("listing_id")
        .in("status", ["confirmed", "pending"])
        .lt("check_in", filters.checkOut)
        .gt("check_out", filters.checkIn),
      supabase
        .from("blocked_periods")
        .select("listing_id")
        .lt("start_date", filters.checkOut)
        .gt("end_date", filters.checkIn),
    ]);

    for (const b of conflicting ?? []) unavailableIds.add(b.listing_id);
    for (const b of blocked ?? []) unavailableIds.add(b.listing_id);
  }

  const available = listings.filter((l) => !unavailableIds.has(l.id));
  if (available.length === 0) return [];

  const listingIds = available.map((l) => l.id);

  // Fetch cover images + review averages in parallel
  const [{ data: images }, { data: reviews }] = await Promise.all([
    supabase
      .from("listing_images")
      .select("listing_id, storage_path, position")
      .in("listing_id", listingIds),
    supabase
      .from("reviews")
      .select("listing_id, rating")
      .in("listing_id", listingIds),
  ]);

  const imagesMap = (images ?? []).reduce<
    Record<string, { storage_path: string; position: number }[]>
  >((acc, img) => {
    if (!acc[img.listing_id]) acc[img.listing_id] = [];
    acc[img.listing_id].push(img);
    return acc;
  }, {});

  // Compute avg rating and count per listing
  const ratingsMap = (reviews ?? []).reduce<Record<string, number[]>>((acc, r) => {
    if (!acc[r.listing_id]) acc[r.listing_id] = [];
    acc[r.listing_id].push(r.rating);
    return acc;
  }, {});

  return available.map((listing) => {
    const sorted = (imagesMap[listing.id] ?? []).sort((a, b) => a.position - b.position);
    const ratings = ratingsMap[listing.id] ?? [];
    const avg_rating = ratings.length > 0
      ? ratings.reduce((s, r) => s + r, 0) / ratings.length
      : null;

    return {
      ...listing,
      cover_image_url: sorted[0] ? getListingImageUrl(sorted[0].storage_path) : null,
      avg_rating,
      review_count: ratings.length,
    };
  });
}

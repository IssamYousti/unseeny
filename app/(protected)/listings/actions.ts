"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guestPriceToHostPayout } from "@/lib/platform-config";
import { getPlatformConfig } from "@/lib/platform-config.server";

async function geocodeAddress(
  street: string,
  houseNumber: string,
  zipCode: string,
  city: string,
  country: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const q = `${street} ${houseNumber}, ${zipCode} ${city}, ${country}`;
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Unseeny/1.0 (platform for private property rentals)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data[0]) return null;

    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function requireApprovedHost(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: role, error } = await supabase
    .from("roles")
    .select("is_approved_host")
    .eq("user_id", userId)
    .single();

  if (error || !role?.is_approved_host) {
    throw new Error("Not allowed: only approved hosts can manage listings");
  }
}

export async function createOrUpdateListing(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await requireApprovedHost(supabase, user.id);

  const listingId = formData.get("listing_id") as string | null;

  const street = formData.get("street") as string;
  const houseNumber = formData.get("house_number") as string;
  const zipCode = formData.get("zip_code") as string;
  const city = formData.get("city") as string;
  const country = formData.get("country") as string;

  // ── Pricing ───────────────────────────────────────────────────────────────
  // PricingInput sends price_per_night = guest price, host_payout_per_night, price_type
  const guestPrice = Number(formData.get("price_per_night"));
  if (!guestPrice || guestPrice <= 0) throw new Error("Please enter a valid price.");

  const priceType = (formData.get("price_type") as string) || "guest_pays";
  const cfg = await getPlatformConfig();
  const hostPayout = Number(formData.get("host_payout_per_night")) || guestPriceToHostPayout(guestPrice, cfg);

  // ── Geocode ───────────────────────────────────────────────────────────────
  const coords = await geocodeAddress(street, houseNumber, zipCode, city, country);

  const payload = {
    host_id: user.id,
    title: formData.get("title"),
    descr: formData.get("descr"),
    street,
    house_number: houseNumber,
    house_number_addition: formData.get("house_number_addition") || null,
    zip_code: zipCode,
    city,
    country,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    max_guests: Number(formData.get("max_guests")),
    bedrooms: Number(formData.get("bedrooms")),
    bathrooms: Number(formData.get("bathrooms")),
    price_per_night: guestPrice,
    host_payout_per_night: hostPayout,
    price_type: priceType,
    amenities: formData.getAll("amenities") as string[],
    updated_at: new Date().toISOString(),
  };

  if (listingId) {
    const { data: existing } = await supabase
      .from("listings")
      .select("host_id")
      .eq("id", listingId)
      .single();

    if (!existing || existing.host_id !== user.id) {
      throw new Error("Not allowed: you do not own this listing");
    }

    const { error } = await supabase
      .from("listings")
      .update({
        ...payload,
        // Reset approval on every content edit — admin must re-approve
        is_approved: false,
        is_rejected: false,
        rejection_reason: null,
      })
      .eq("id", listingId);

    if (error) throw new Error(error.message);

    revalidatePath("/listings");
    revalidatePath("/profile");
    redirect(`/listings/manage/${listingId}?saved=1`);
  } else {
    const { data: newListing, error } = await supabase
      .from("listings")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/listings");
    revalidatePath("/profile");
    redirect(`/listings/manage/${newListing.id}?created=1`);
  }
}

export async function archiveListing(listingId: string, archive: boolean) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await requireApprovedHost(supabase, user.id);

  const { data: existing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!existing || existing.host_id !== user.id) {
    throw new Error("Not allowed: you do not own this listing");
  }

  const { error } = await supabase
    .from("listings")
    .update({ is_archived: archive, updated_at: new Date().toISOString() })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  revalidatePath("/listings");
  revalidatePath("/profile");
}

export async function deleteListing(listingId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await requireApprovedHost(supabase, user.id);

  const { data: existing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!existing || existing.host_id !== user.id) {
    throw new Error("Not allowed: you do not own this listing");
  }

  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) throw new Error(error.message);

  revalidatePath("/listings");
  revalidatePath("/profile");
  redirect("/profile");
}

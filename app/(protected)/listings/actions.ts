"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireApprovedHost(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: role, error } = await supabase
    .from("roles")
    .select("is_approved_owner")
    .eq("user_id", userId)
    .single();

  if (error || !role?.is_approved_owner) {
    throw new Error("Not allowed: only approved hosts can manage listings");
  }
}

export async function createOrUpdateListing(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // 🔒 HOST CHECK
  await requireApprovedHost(supabase, user.id);

  const listingId = formData.get("listing_id") as string | null;

  const payload = {
    host_id: user.id,
    title: formData.get("title"),
    descr: formData.get("descr"),
    street: formData.get("street"),
    house_number: formData.get("house_number"),
    house_number_addition: formData.get("house_number_addition") || null,
    zip_code: formData.get("zip_code"),
    city: formData.get("city"),
    country: formData.get("country"),
    max_guests: Number(formData.get("max_guests")),
    bedrooms: Number(formData.get("bedrooms")),
    bathrooms: Number(formData.get("bathrooms")),
    price_per_night: Number(formData.get("price_per_night")),
    updated_at: new Date().toISOString(),
  };

  if (listingId) {
    // 🔒 Ensure user owns listing before updating
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
      .update(payload)
      .eq("id", listingId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("listings")
      .insert(payload);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/listings");
  revalidatePath("/profile");
  redirect("/profile");
}

export async function deleteListing(listingId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // 🔒 HOST CHECK
  await requireApprovedHost(supabase, user.id);

  // 🔒 Ensure ownership
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
    .delete()
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  revalidatePath("/listings");
  revalidatePath("/profile");
  redirect("/profile");
}

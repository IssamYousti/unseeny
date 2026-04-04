"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Anonymous e-mail subscription (existing, unchanged) ──────────────────────

export async function subscribeToNotifications(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string; already?: boolean }> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_notifications")
    .insert({ email });

  if (error) {
    if (error.code === "23505") return { already: true };
    return { error: error.message };
  }

  return { success: true };
}

// ── Authenticated user preference management ──────────────────────────────────

/** Parse a comma-separated string into a deduplicated, trimmed, non-empty array. */
function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

export async function saveNotificationPreferences(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const isActive = formData.get("is_active") === "on";
  const countries = parseList(formData.get("countries") as string | null);
  const cities = parseList(formData.get("cities") as string | null);
  const maxPriceRaw = formData.get("max_price") as string | null;
  const minGuestsRaw = formData.get("min_guests") as string | null;
  const amenities = formData.getAll("amenities") as string[];

  const maxPrice = maxPriceRaw && maxPriceRaw !== "" ? Number(maxPriceRaw) : null;
  const minGuests = minGuestsRaw && minGuestsRaw !== "" ? Number(minGuestsRaw) : null;

  // Get user's email so we can fill that column (required NOT NULL in original schema)
  const email = user.email ?? "";

  const { error } = await supabase
    .from("listing_notifications")
    .upsert(
      {
        user_id: user.id,
        email,
        countries,
        cities,
        max_price: maxPrice,
        min_guests: minGuests,
        amenities,
        is_active: isActive,
      },
      { onConflict: "user_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function deleteNotificationPreferences(
  _prev: unknown,
  _formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("listing_notifications")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

// Used server-side to pre-populate the form
export type NotificationPreferences = {
  is_active: boolean;
  countries: string[];
  cities: string[];
  max_price: number | null;
  min_guests: number | null;
  amenities: string[];
};

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_notifications")
    .select("is_active, countries, cities, max_price, min_guests, amenities")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    is_active: data.is_active ?? true,
    countries: data.countries ?? [],
    cities: data.cities ?? [],
    max_price: data.max_price ?? null,
    min_guests: data.min_guests ?? null,
    amenities: data.amenities ?? [],
  };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  sendApplicationApproved,
  sendApplicationRejected,
  sendListingApproved,
  sendNewListingNotification,
} from "@/lib/email";

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: role, error } = await supabase
    .from("roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (error || !role?.is_admin) throw new Error("Not authorized");
}

async function getUserEmail(userId: string): Promise<{ email: string; firstName: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Could not fetch user");

  const email = data.user.email ?? "";

  // Try to get first name from profiles
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();

  const firstName = profile?.first_name ?? email.split("@")[0];

  return { email, firstName };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function approveListing(listingId: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data: listing, error } = await supabase
    .from("listings")
    .update({ is_approved: true, updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .select("host_id, title")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/listings");

  // Email the host
  try {
    const { email, firstName } = await getUserEmail(listing.host_id);
    await sendListingApproved(email, firstName, listing.title, listingId);
  } catch {
    // Non-fatal — listing is still approved even if email fails
  }

  // Email notification subscribers — filtered by each subscriber's preferences
  try {
    const admin = createAdminClient();

    // Fetch full listing detail for matching
    const { data: listingDetail } = await admin
      .from("listings")
      .select("city, country, price_per_night, max_guests, amenities")
      .eq("id", listingId)
      .single();

    // Fetch all active subscribers with their preferences
    const { data: subs } = await admin
      .from("listing_notifications")
      .select("email, countries, cities, max_price, min_guests, amenities, is_active")
      .eq("is_active", true);

    if (subs && subs.length > 0 && listingDetail) {
      const lCountry = (listingDetail.country ?? "").toLowerCase();
      const lCity = (listingDetail.city ?? "").toLowerCase();
      const lPrice = Number(listingDetail.price_per_night ?? 0);
      const lGuests = Number(listingDetail.max_guests ?? 0);
      const lAmenities: string[] = listingDetail.amenities ?? [];

      const matchedEmails = subs
        .filter((s) => {
          // Country filter: if list non-empty, listing country must be in it
          if (s.countries?.length > 0) {
            const match = s.countries.some(
              (c: string) => c.toLowerCase() === lCountry,
            );
            if (!match) return false;
          }
          // City filter
          if (s.cities?.length > 0) {
            const match = s.cities.some(
              (c: string) => c.toLowerCase() === lCity,
            );
            if (!match) return false;
          }
          // Max price
          if (s.max_price != null && lPrice > Number(s.max_price)) return false;
          // Min guests capacity
          if (s.min_guests != null && lGuests < Number(s.min_guests)) return false;
          // Amenities: listing must have at least one of the required amenities
          if (s.amenities?.length > 0) {
            const hasAny = s.amenities.some((a: string) => lAmenities.includes(a));
            if (!hasAny) return false;
          }
          return true;
        })
        .map((s) => s.email as string)
        .filter(Boolean);

      if (matchedEmails.length > 0) {
        await sendNewListingNotification(
          matchedEmails,
          listing.title,
          listingId,
          listingDetail.city ?? null,
          listingDetail.country ?? null,
        );
      }
    }
  } catch {
    // Non-fatal
  }
}

export async function rejectListing(listingId: string, reason?: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { error } = await supabase
    .from("listings")
    .update({
      is_approved: false,
      is_rejected: true,
      rejection_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/listings");
}

export async function approveHostApplication(applicationId: string, userId: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { error: appError } = await supabase
    .from("host_applications")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (appError) throw new Error(appError.message);

  const { error: roleError } = await supabase
    .from("roles")
    .update({ is_approved_host: true })
    .eq("user_id", userId);

  if (roleError) throw new Error(roleError.message);

  revalidatePath("/admin");

  // Email the applicant
  try {
    const { email, firstName } = await getUserEmail(userId);
    await sendApplicationApproved(email, firstName);
  } catch {
    // Non-fatal
  }
}

export async function rejectHostApplication(applicationId: string, adminNotes?: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data: app, error } = await supabase
    .from("host_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes ?? null,
    })
    .eq("id", applicationId)
    .select("user_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin");

  // Email the applicant
  try {
    const { email, firstName } = await getUserEmail(app.user_id);
    await sendApplicationRejected(email, firstName, adminNotes);
  } catch {
    // Non-fatal
  }
}

export async function adminConfirmBooking(bookingId: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function adminRejectBooking(bookingId: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "rejected" })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function adminDeleteReview(reviewId: string, type: "listing" | "guest") {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const table = type === "listing" ? "reviews" : "guest_reviews";

  const { error } = await supabase.from(table).delete().eq("id", reviewId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipment management
// ─────────────────────────────────────────────────────────────────────────────

export async function adminToggleEquipment(itemId: string, isActive: boolean) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const admin = createAdminClient();
  const { error } = await admin
    .from("equipment_items")
    .update({ is_active: isActive })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function adminAddEquipment(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const key = (formData.get("key") as string)?.trim().toLowerCase().replace(/\s+/g, "_");
  const category = formData.get("category") as string;
  const name_en = (formData.get("name_en") as string)?.trim();
  const name_nl = (formData.get("name_nl") as string)?.trim() || name_en;
  const name_fr = (formData.get("name_fr") as string)?.trim() || name_en;

  if (!key || !category || !name_en) throw new Error("Missing required fields");

  const admin = createAdminClient();
  const { error } = await admin.from("equipment_items").insert({
    key,
    category,
    name_en,
    name_nl,
    name_fr,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function adminDeleteEquipment(itemId: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const admin = createAdminClient();
  const { error } = await admin.from("equipment_items").delete().eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat moderation — blacklist management
// ─────────────────────────────────────────────────────────────────────────────

export async function adminAddBlacklistItem(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const type = formData.get("type") as string;
  const value = (formData.get("value") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;

  if (!type || !value) throw new Error("Type and value are required");

  const admin = createAdminClient();
  const { error } = await admin.from("chat_blacklist").insert({ type, value, description });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function adminToggleBlacklistItem(itemId: string, isActive: boolean) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_blacklist")
    .update({ is_active: isActive })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function adminDeleteBlacklistItem(itemId: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const admin = createAdminClient();
  const { error } = await admin.from("chat_blacklist").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat moderation — violation review
// ─────────────────────────────────────────────────────────────────────────────

export async function adminReviewViolation(
  violationId: string,
  action: "dismissed" | "warned",
) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_violations")
    .update({
      is_reviewed: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_action: action,
    })
    .eq("id", violationId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

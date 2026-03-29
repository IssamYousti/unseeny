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

  // Email notification subscribers
  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("listing_notifications")
      .select("email");
    if (subs && subs.length > 0) {
      const { data: listingDetail } = await admin
        .from("listings")
        .select("city, country")
        .eq("id", listingId)
        .single();
      await sendNewListingNotification(
        subs.map((s) => s.email),
        listing.title,
        listingId,
        listingDetail?.city ?? null,
        listingDetail?.country ?? null,
      );
    }
  } catch {
    // Non-fatal
  }
}

export async function rejectListing(listingId: string) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { error } = await supabase
    .from("listings")
    .update({ is_approved: false, updated_at: new Date().toISOString() })
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

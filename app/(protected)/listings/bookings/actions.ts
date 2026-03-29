"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendBookingApproved, sendBookingRejected } from "@/lib/email";
import { createNotification } from "@/lib/data/notifications";

async function getBookingAndVerifyHost(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, listings(title)")
    .eq("id", bookingId)
    .eq("host_id", user.id)
    .single();

  if (!booking) throw new Error("Booking not found or access denied");
  return { supabase, user, booking };
}

export async function confirmBooking(bookingId: string) {
  const { supabase, booking } = await getBookingAndVerifyHost(bookingId);

  // Move to "approved" — guest must now pay to fully confirm
  await supabase
    .from("bookings")
    .update({ status: "approved" })
    .eq("id", bookingId);

  const listingTitle = (booking.listings as { title: string } | null)?.title ?? "the property";

  await createNotification({
    userId: booking.guest_id,
    type: "booking_approved",
    title: "Booking approved — payment required",
    body: `Your request for "${listingTitle}" (${booking.check_in} → ${booking.check_out}) was approved. Please complete your payment to secure the stay.`,
    link: "/bookings",
  });

  try {
    const admin = createAdminClient();
    const { data: guestUser } = await admin.auth.admin.getUserById(booking.guest_id);
    const { data: guestProfile } = await admin
      .from("profiles")
      .select("first_name")
      .eq("id", booking.guest_id)
      .maybeSingle();

    const guestEmail = guestUser?.user?.email;
    const guestFirstName = guestProfile?.first_name ?? guestEmail?.split("@")[0] ?? "Guest";

    if (guestEmail) {
      await sendBookingApproved(
        guestEmail,
        guestFirstName,
        listingTitle,
        booking.check_in,
        booking.check_out,
        Number(booking.total_price),
      );
    }
  } catch {
    // Non-fatal
  }

  revalidatePath("/bookings");
  redirect("/listings/bookings");
}

export async function rejectBooking(bookingId: string) {
  const { supabase, booking } = await getBookingAndVerifyHost(bookingId);

  await supabase
    .from("bookings")
    .update({ status: "rejected" })
    .eq("id", bookingId);

  await createNotification({
    userId: booking.guest_id,
    type: "booking_rejected",
    title: "Booking request declined",
    body: `Your booking request for "${(booking.listings as { title: string } | null)?.title ?? "the property"}" (${booking.check_in} → ${booking.check_out}) was not accepted.`,
    link: "/bookings",
  });

  try {
    const admin = createAdminClient();
    const { data: guestUser } = await admin.auth.admin.getUserById(booking.guest_id);
    const { data: guestProfile } = await admin
      .from("profiles")
      .select("first_name")
      .eq("id", booking.guest_id)
      .maybeSingle();

    const guestEmail = guestUser?.user?.email;
    const guestFirstName = guestProfile?.first_name ?? guestEmail?.split("@")[0] ?? "Guest";
    const listingTitle = (booking.listings as { title: string } | null)?.title ?? "your villa";

    if (guestEmail) {
      await sendBookingRejected(
        guestEmail,
        guestFirstName,
        listingTitle,
        booking.check_in,
        booking.check_out,
      );
    }
  } catch {
    // Non-fatal
  }

  redirect("/listings/bookings");
}

export async function submitGuestReview(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const bookingId = formData.get("booking_id") as string;
  const guestId = formData.get("guest_id") as string;
  const rating = Number(formData.get("rating"));
  const comment = (formData.get("comment") as string)?.trim() || null;

  if (!rating || rating < 1 || rating > 5) {
    return { error: "Please select a rating between 1 and 5 stars." };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, check_out, host_id")
    .eq("id", bookingId)
    .eq("host_id", user.id)
    .single();

  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "confirmed") return { error: "You can only review a guest after a confirmed stay." };

  const today = new Date().toISOString().split("T")[0];
  if (booking.check_out > today) {
    return { error: "You can leave a review after the guest's check-out date." };
  }

  const { error } = await supabase.from("guest_reviews").upsert(
    { booking_id: bookingId, host_id: user.id, guest_id: guestId, rating, comment },
    { onConflict: "booking_id" },
  );

  if (error) return { error: "Could not submit review. Please try again." };

  revalidatePath("/listings/bookings");
  return { success: true };
}

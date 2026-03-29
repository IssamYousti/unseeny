"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/data/notifications";
import { sendBookingRequest } from "@/lib/email";

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function createBooking(_prev: unknown, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const listingId = formData.get("listing_id") as string;
  const checkIn = formData.get("check_in") as string;
  const checkOut = formData.get("check_out") as string;
  const guestsCount = Number(formData.get("guests_count") ?? 1);
  const totalPrice = Number(formData.get("total_price") ?? 0);
  const guestMessage = ((formData.get("guest_message") as string) ?? "").trim();

  const today = new Date().toISOString().split("T")[0];
  if (!checkIn || !checkOut) return { error: "Please select check-in and check-out dates." };
  if (checkIn < today) return { error: "Check-in date cannot be in the past." };
  if (checkOut <= checkIn) return { error: "Check-out must be after check-in." };
  if (totalPrice <= 0) return { error: "Invalid total price." };

  const { data: listing } = await supabase
    .from("listings")
    .select("host_id, title, max_guests, is_approved, price_per_night")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };
  if (!listing.is_approved) return { error: "This listing is not available for booking." };
  if (listing.host_id === user.id) return { error: "You cannot book your own listing." };
  if (guestsCount > listing.max_guests) return { error: `Maximum ${listing.max_guests} guests allowed.` };

  const nights = Math.floor(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );
  const expectedTotal = nights * Number(listing.price_per_night);
  if (Math.abs(totalPrice - expectedTotal) > 0.01) {
    return { error: "Price mismatch. Please refresh and try again." };
  }

  const [{ data: conflicts }, { data: blockedConflicts }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id")
      .eq("listing_id", listingId)
      .in("status", ["confirmed", "pending"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn)
      .limit(1),
    supabase
      .from("blocked_periods")
      .select("id")
      .eq("listing_id", listingId)
      .lt("start_date", checkOut)
      .gt("end_date", checkIn)
      .limit(1),
  ]);

  if ((conflicts && conflicts.length > 0) || (blockedConflicts && blockedConflicts.length > 0)) {
    return { error: "These dates are no longer available. Please select different dates." };
  }

  const admin = createAdminClient();

  // Create or reuse conversation
  let { data: conversation } = await admin
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("guest_id", user.id)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv } = await admin
      .from("conversations")
      .insert({ listing_id: listingId, guest_id: user.id, host_id: listing.host_id })
      .select("id")
      .single();
    conversation = newConv;
  }

  // Create booking
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      listing_id: listingId,
      guest_id: user.id,
      host_id: listing.host_id,
      conversation_id: conversation?.id ?? null,
      check_in: checkIn,
      check_out: checkOut,
      guests_count: guestsCount,
      total_price: totalPrice,
      status: "pending",
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    return { error: "Could not create booking. Please try again." };
  }

  // Insert booking summary + optional guest message into conversation
  if (conversation?.id) {
    const messages = [
      {
        conversation_id: conversation.id,
        sender_id: user.id,
        content: `📅 Booking request\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guestsCount} · ${nights} night${nights !== 1 ? "s" : ""}\nTotal: €${totalPrice.toLocaleString()}`,
      },
    ];
    if (guestMessage) {
      messages.push({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: guestMessage,
      });
    }
    await admin.from("messages").insert(messages);
  }

  // Notify host (in-app)
  const { data: guestProfile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const guestName =
    [guestProfile?.first_name, guestProfile?.last_name].filter(Boolean).join(" ") || "A guest";

  await createNotification({
    userId: listing.host_id,
    type: "booking_request",
    title: "New booking request",
    body: `${guestName} requested ${checkIn} → ${checkOut} for "${listing.title}"`,
    link: "/listings/bookings",
  });

  // Email host
  try {
    const [{ data: hostUser }, { data: hostProfile }] = await Promise.all([
      admin.auth.admin.getUserById(listing.host_id),
      admin.from("profiles").select("first_name").eq("id", listing.host_id).maybeSingle(),
    ]);
    const hostEmail = hostUser?.user?.email;
    const hostFirstName = hostProfile?.first_name ?? hostEmail?.split("@")[0] ?? "Host";
    if (hostEmail) {
      await sendBookingRequest(
        hostEmail,
        hostFirstName,
        guestName,
        listing.title,
        conversation?.id ?? "",
        checkIn,
        checkOut,
        nights,
        guestsCount,
        totalPrice,
      );
    }
  } catch {
    // Non-fatal
  }

  redirect("/bookings?requested=true");
}

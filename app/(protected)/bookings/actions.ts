"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function initiatePayment(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, listings(title)")
    .eq("id", bookingId)
    .eq("guest_id", user.id)
    .single();

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "approved") throw new Error("Only approved bookings can be paid for");

  const listingTitle = (booking.listings as { title: string } | null)?.title ?? "Property";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: listingTitle },
          unit_amount: Math.round(Number(booking.total_price) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
    },
    success_url: `${BASE_URL}/bookings?paid=true`,
    cancel_url: `${BASE_URL}/bookings`,
  });

  redirect(session.url!);
}

export async function submitReview(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const bookingId = formData.get("booking_id") as string;
  const listingId = formData.get("listing_id") as string;
  const rating = Number(formData.get("rating"));
  const comment = (formData.get("comment") as string)?.trim() || null;

  if (!rating || rating < 1 || rating > 5) {
    return { error: "Please select a rating between 1 and 5 stars." };
  }

  // Verify the booking belongs to this guest and is confirmed + past checkout
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, check_out, guest_id")
    .eq("id", bookingId)
    .eq("guest_id", user.id)
    .single();

  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "confirmed") return { error: "You can only review a confirmed stay." };

  const today = new Date().toISOString().split("T")[0];
  if (booking.check_out > today) {
    return { error: "You can leave a review after your check-out date." };
  }

  // Upsert — allow updating an existing review for the same booking
  const { error } = await supabase.from("reviews").upsert(
    {
      listing_id: listingId,
      booking_id: bookingId,
      reviewer_id: user.id,
      rating,
      comment,
    },
    { onConflict: "booking_id" },
  );

  if (error) return { error: "Could not submit review. Please try again." };

  return { success: true };
}

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Only the guest can cancel, and only if the booking is still pending
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, guest_id")
    .eq("id", bookingId)
    .eq("guest_id", user.id)
    .single();

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "pending") throw new Error("Only pending bookings can be cancelled");

  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  revalidatePath("/bookings");
}

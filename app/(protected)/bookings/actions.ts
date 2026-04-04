"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000";

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

export async function cancelBooking(bookingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch booking + linked listing for policy lookup
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, guest_id, listing_id, check_in, total_price, stripe_session_id, conversation_id")
    .eq("id", bookingId)
    .eq("guest_id", user.id)
    .single();

  if (!booking) throw new Error("Booking not found");
  if (!["pending", "approved", "confirmed"].includes(booking.status)) {
    throw new Error("This booking cannot be cancelled");
  }

  let refundAmount = 0;

  // Only process Stripe refund for confirmed bookings with a session ID
  if (booking.status === "confirmed" && booking.stripe_session_id) {
    // Retrieve the Stripe session to get the payment_intent
    const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (paymentIntentId) {
      // Fetch cancellation policy for this listing
      const { data: policy } = await supabase
        .from("listing_cancellation_policy")
        .select("policy_type, full_refund_days_before, partial_refund_days_before, partial_refund_percentage, cutoff_hour, timezone")
        .eq("listing_id", booking.listing_id)
        .maybeSingle();

      if (policy) {
        const { calculateRefund } = await import("@/lib/cancellation");
        const refundResult = calculateRefund(
          Number(booking.total_price),
          booking.check_in,
          new Date(),
          {
            policy_type: policy.policy_type as import("@/lib/cancellation").PolicyType,
            full_refund_days_before: policy.full_refund_days_before,
            partial_refund_days_before: policy.partial_refund_days_before,
            partial_refund_percentage: policy.partial_refund_percentage,
            cutoff_hour: policy.cutoff_hour,
            timezone: policy.timezone,
          },
        );

        refundAmount = refundResult.amount;
      } else {
        // No policy — default to full refund
        refundAmount = Number(booking.total_price);
      }

      // Issue Stripe refund if there's any amount to refund
      if (refundAmount > 0) {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100), // convert to cents
        });
      }
    }
  }

  // Update booking record
  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: "guest",
      refund_amount: refundAmount > 0 ? refundAmount : null,
      refunded_at: refundAmount > 0 ? new Date().toISOString() : null,
    })
    .eq("id", bookingId);

  // System message in chat
  if (booking.conversation_id) {
    await supabase.from("messages").insert({
      conversation_id: booking.conversation_id,
      sender_id: user.id,
      content:
        refundAmount > 0
          ? `❌ Booking cancelled by guest. Refund of €${refundAmount.toFixed(2)} has been issued.`
          : "❌ Booking cancelled by guest.",
    });
  }

  revalidatePath("/bookings");
}

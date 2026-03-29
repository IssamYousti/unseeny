import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingRequest } from "@/lib/email";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata;

    const admin = createAdminClient();

    // ── New flow: payment for an existing approved booking ──────────────────
    if (meta?.booking_id) {
      // Idempotency: skip if already confirmed
      const { data: booking } = await admin
        .from("bookings")
        .select("id, status, guest_id, host_id, conversation_id, check_in, check_out, guests_count, total_price, listings(title)")
        .eq("id", meta.booking_id)
        .maybeSingle();

      if (!booking || booking.status === "confirmed") {
        return NextResponse.json({ received: true });
      }

      await admin
        .from("bookings")
        .update({ status: "confirmed", stripe_session_id: session.id })
        .eq("id", meta.booking_id);

      // System message in conversation
      if (booking.conversation_id) {
        await admin.from("messages").insert({
          conversation_id: booking.conversation_id,
          sender_id: booking.guest_id,
          content: "✅ Payment confirmed — booking is now confirmed!",
        });
      }

      // Notify guest + send confirmation email
      try {
        const { sendBookingConfirmed } = await import("@/lib/email");
        const { createNotification } = await import("@/lib/data/notifications");
        const listingTitle = (booking.listings as unknown as { title: string } | null)?.title ?? "the property";

        await createNotification({
          userId: booking.guest_id,
          type: "booking_confirmed",
          title: "Booking confirmed!",
          body: `Your booking for "${listingTitle}" (${booking.check_in} → ${booking.check_out}) is confirmed.`,
          link: "/bookings",
        });

        const { data: guestUser } = await admin.auth.admin.getUserById(booking.guest_id);
        const { data: guestProfile } = await admin
          .from("profiles")
          .select("first_name")
          .eq("id", booking.guest_id)
          .maybeSingle();

        const guestEmail = guestUser?.user?.email;
        const guestFirstName = guestProfile?.first_name ?? guestEmail?.split("@")[0] ?? "Guest";

        if (guestEmail) {
          await sendBookingConfirmed(
            guestEmail,
            guestFirstName,
            listingTitle,
            booking.check_in,
            booking.check_out,
            booking.conversation_id,
          );
        }
      } catch {
        // Non-fatal
      }

      return NextResponse.json({ received: true });
    }

    // ── Legacy flow: booking created via old Stripe checkout ─────────────────
    if (!meta?.listing_id || !meta?.guest_id) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Idempotency: skip if booking already created for this session
    const { data: existing } = await admin
      .from("bookings")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true });
    }

    // Create or find conversation
    let { data: conversation } = await admin
      .from("conversations")
      .select("id")
      .eq("listing_id", meta.listing_id)
      .eq("guest_id", meta.guest_id)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv } = await admin
        .from("conversations")
        .insert({
          listing_id: meta.listing_id,
          guest_id: meta.guest_id,
          host_id: meta.host_id,
        })
        .select("id")
        .single();
      conversation = newConv;
    }

    // Create booking
    const { data: booking } = await admin
      .from("bookings")
      .insert({
        listing_id: meta.listing_id,
        guest_id: meta.guest_id,
        host_id: meta.host_id,
        conversation_id: conversation?.id ?? null,
        check_in: meta.check_in,
        check_out: meta.check_out,
        guests_count: Number(meta.guests_count),
        total_price: Number(meta.total_price),
        stripe_session_id: session.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // Insert booking message in conversation
    if (conversation?.id) {
      const nights = Number(meta.nights);
      await admin.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: meta.guest_id,
        content: `📅 Booking request\nCheck-in: ${meta.check_in}\nCheck-out: ${meta.check_out}\nGuests: ${meta.guests_count} · ${nights} night${nights !== 1 ? "s" : ""}\nTotal: €${Number(meta.total_price).toLocaleString()}\n✅ Payment confirmed`,
      });
    }

    // Notify host via email
    try {
      const [{ data: hostUser }, { data: guestProfile }, { data: hostProfile }] = await Promise.all([
        admin.auth.admin.getUserById(meta.host_id),
        admin.from("profiles").select("first_name, last_name").eq("id", meta.guest_id).maybeSingle(),
        admin.from("profiles").select("first_name").eq("id", meta.host_id).maybeSingle(),
      ]);

      const hostEmail = hostUser?.user?.email;
      const hostFirstName = hostProfile?.first_name ?? hostEmail?.split("@")[0] ?? "Host";
      const guestName =
        [guestProfile?.first_name, guestProfile?.last_name].filter(Boolean).join(" ") ||
        "A guest";

      if (hostEmail) {
        await sendBookingRequest(
          hostEmail,
          hostFirstName,
          guestName,
          meta.listing_title ?? "your property",
          conversation?.id ?? "",
          meta.check_in,
          meta.check_out,
          Number(meta.nights),
          Number(meta.guests_count),
          Number(meta.total_price),
        );
      }
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({ received: true });
}

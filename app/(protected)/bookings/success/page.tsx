import { Suspense } from "react";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CheckCircle, CalendarDays, Users, ArrowRight } from "lucide-react";

async function BookingSuccess({ sessionId }: { sessionId: string }) {
  const [supabase, session] = await Promise.all([
    createClient(),
    stripe.checkout.sessions.retrieve(sessionId),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  // Verify ownership
  if (!user || session.metadata?.guest_id !== user.id) {
    return (
      <main className="bg-background min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid session.</p>
      </main>
    );
  }

  // Verify payment actually completed
  if (session.payment_status !== "paid") {
    return (
      <main className="bg-background min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-lg font-medium">Payment was not completed.</p>
          <p className="text-muted-foreground text-sm">Your card was not charged. You can try again from the listing page.</p>
          <Link
            href={`/listings/${session.metadata?.listing_id ?? ""}`}
            className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition"
          >
            Back to listing
          </Link>
        </div>
      </main>
    );
  }

  const meta = session.metadata!;
  const nights = Number(meta.nights);
  const total = Number(meta.total_price);

  // Find the booking — may still be processing via webhook when page first loads
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, conversation_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  return (
    <main className="bg-background min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8 text-center">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Payment confirmed</h1>
          <p className="text-muted-foreground">
            Your booking request for <strong className="text-foreground">{meta.listing_title}</strong> has been sent to the host.
          </p>
        </div>

        {/* Booking details */}
        <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-4">
          <div className="flex items-center gap-2.5 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Dates</span>
            <span className="ml-auto font-medium">{meta.check_in} → {meta.check_out}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Guests</span>
            <span className="ml-auto font-medium">{meta.guests_count}</span>
          </div>
          <div className="border-t border-border pt-4 flex items-center justify-between text-sm font-semibold">
            <span>Total paid</span>
            <span>€{total.toLocaleString()}</span>
          </div>
        </div>

        {/* What's next */}
        <div className="bg-muted/50 rounded-xl px-5 py-4 text-left text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">What happens next?</p>
          <p>
            The host will review your request and confirm or decline within 24 hours.
            You&apos;ll receive an email either way. If the messaging link below doesn&apos;t appear yet,
            check <strong className="text-foreground">My bookings</strong> in a moment.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {booking?.conversation_id && (
            <Link
              href={`/chat/${booking.conversation_id}`}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:opacity-90 transition"
            >
              Message the host
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/bookings"
            className="flex items-center justify-center gap-2 border border-border text-muted-foreground py-3 rounded-xl text-sm hover:text-foreground hover:border-foreground/30 transition"
          >
            View my bookings
          </Link>
        </div>

      </div>
    </main>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground text-center">Confirming your booking…</div>}>
      <BookingSuccessLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function BookingSuccessLoader({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // Validate format before hitting the Stripe API
  if (!session_id || !session_id.startsWith("cs_")) {
    return (
      <main className="bg-background min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No session found.</p>
      </main>
    );
  }

  return <BookingSuccess sessionId={session_id} />;
}

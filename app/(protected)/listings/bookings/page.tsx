import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { confirmBooking, rejectBooking } from "./actions";
import { getTranslations } from "next-intl/server";
import { CalendarDays, Users, Check, X, Star, UserCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import GuestReviewForm from "@/components/GuestReviewForm";

type GuestInfo = {
  id: string;
  name: string;
  memberSince: string;
  confirmedStays: number;
  avgGuestRating: number | null;
  reviewCount: number;
};

type EnrichedBooking = {
  id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: string;
  created_at: string;
  guest_id: string;
  conversation_id: string | null;
  listings: { title: string; city: string } | null;
  guest: GuestInfo;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  rejected: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function nights(checkIn: string, checkOut: string) {
  return Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
}

async function HostBookings() {
  const [supabase, t] = await Promise.all([createClient(), getTranslations("hostBookings")]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("*, listings(title, city)")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  if (!rawBookings || rawBookings.length === 0) {
    return (
      <main className="bg-background min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("no_pending")}</p>
        </div>
      </main>
    );
  }

  // Fetch guest profiles, confirmed stay counts, and guest ratings
  const guestIds = [...new Set(rawBookings.map((b) => b.guest_id))];

  const [{ data: profiles }, { data: stayData }, { data: guestRatings }, { data: reviewedBookingIds }] =
    await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, created_at").in("id", guestIds),
      supabase
        .from("bookings")
        .select("guest_id")
        .in("guest_id", guestIds)
        .eq("status", "confirmed"),
      supabase
        .from("guest_reviews")
        .select("guest_id, rating")
        .in("guest_id", guestIds),
      supabase
        .from("guest_reviews")
        .select("booking_id")
        .eq("host_id", user.id),
    ]);

  // Build lookup maps
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const stayCountMap: Record<string, number> = {};
  for (const s of stayData ?? []) {
    stayCountMap[s.guest_id] = (stayCountMap[s.guest_id] ?? 0) + 1;
  }

  const ratingMap: Record<string, number[]> = {};
  for (const r of guestRatings ?? []) {
    if (!ratingMap[r.guest_id]) ratingMap[r.guest_id] = [];
    ratingMap[r.guest_id].push(r.rating);
  }

  const reviewedSet = new Set((reviewedBookingIds ?? []).map((r) => r.booking_id));

  // Enrich bookings
  const bookings: EnrichedBooking[] = rawBookings.map((b) => {
    const p = profileMap[b.guest_id];
    const ratings = ratingMap[b.guest_id] ?? [];
    const name = p
      ? [p.first_name, p.last_name].filter(Boolean).join(" ") || t("guest_anonymous")
      : t("guest_anonymous");
    const memberSince = p?.created_at
      ? new Date(p.created_at).getFullYear().toString()
      : "—";

    return {
      ...b,
      guest: {
        id: b.guest_id,
        name,
        memberSince,
        confirmedStays: stayCountMap[b.guest_id] ?? 0,
        avgGuestRating: ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null,
        reviewCount: ratings.length,
      },
    };
  });

  const pending = bookings.filter((b) => b.status === "pending");
  const other = bookings.filter((b) => b.status !== "pending");

  const guestReviewLabels = {
    title: t("guest_review_title"),
    placeholder: t("guest_review_placeholder"),
    submit: t("guest_review_submit"),
    success: t("guest_review_success"),
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>

        {/* Pending */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">
            {t("pending_title")}
            {pending.length > 0 && (
              <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("no_pending")}</p>
          ) : (
            <div className="space-y-4">
              {pending.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  t={t}
                  showActions
                  showGuestReview={false}
                  alreadyReviewed={false}
                  guestReviewLabels={guestReviewLabels}
                />
              ))}
            </div>
          )}
        </section>

        {/* All other bookings */}
        {other.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold">{t("all_title")}</h2>
            <div className="space-y-4">
              {other.map((b) => {
                const isPast = b.check_out < today;
                const canReviewGuest = b.status === "confirmed" && isPast && !reviewedSet.has(b.id);
                return (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    t={t}
                    showActions={false}
                    showGuestReview={canReviewGuest}
                    alreadyReviewed={b.status === "confirmed" && isPast && reviewedSet.has(b.id)}
                    guestReviewLabels={guestReviewLabels}
                  />
                );
              })}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}

function GuestBadge({ guest, t }: { guest: GuestInfo; t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
        {guest.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/guests/${guest.id}`}
            className="text-sm font-medium hover:underline flex items-center gap-1"
          >
            <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
            {guest.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {t("member_since")} {guest.memberSince}
          </span>
          {guest.confirmedStays > 0 && (
            <span className="text-xs text-muted-foreground">
              · {guest.confirmedStays} {guest.confirmedStays === 1 ? t("stay_single") : t("stay_plural")}
            </span>
          )}
          {guest.avgGuestRating != null && (
            <span className="flex items-center gap-0.5 text-xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-medium">{guest.avgGuestRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({guest.reviewCount})</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  t,
  showActions,
  showGuestReview,
  alreadyReviewed,
  guestReviewLabels,
}: {
  booking: EnrichedBooking;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  showActions: boolean;
  showGuestReview: boolean;
  alreadyReviewed: boolean;
  guestReviewLabels: { title: string; placeholder: string; submit: string; success: string };
}) {
  const n = nights(booking.check_in, booking.check_out);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Listing + status */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-medium">{booking.listings?.title ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{booking.listings?.city}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[booking.status] ?? ""}`}>
          {t(`status_${booking.status}`)}
        </span>
      </div>

      {/* Guest info */}
      <GuestBadge guest={booking.guest} t={t} />

      {/* Booking details */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{booking.check_in} → {booking.check_out}</span>
          <span className="text-foreground font-medium ml-1">({n} {t("nights")})</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{booking.guests_count} {t("guests")}</span>
        </div>
        <div className="font-semibold">€{Number(booking.total_price).toLocaleString()}</div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {showActions && (
          <>
            <form action={confirmBooking.bind(null, booking.id)}>
              <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                <Check className="h-3.5 w-3.5" />
                {t("confirm")}
              </button>
            </form>
            <form action={rejectBooking.bind(null, booking.id)}>
              <button className="flex items-center gap-1.5 border border-border text-muted-foreground px-4 py-2 rounded-lg text-sm hover:text-foreground hover:border-foreground/30 transition">
                <X className="h-3.5 w-3.5" />
                {t("reject")}
              </button>
            </form>
          </>
        )}
        {booking.conversation_id && (
          <Link
            href={`/chat/${booking.conversation_id}`}
            className="flex items-center gap-1.5 border border-border text-muted-foreground px-4 py-2 rounded-lg text-sm hover:text-foreground hover:border-foreground/30 transition"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Message guest
          </Link>
        )}
      </div>

      {/* Host → guest review */}
      {showGuestReview && (
        <GuestReviewForm
          bookingId={booking.id}
          guestId={booking.guest_id}
          labels={guestReviewLabels}
        />
      )}

      {alreadyReviewed && (
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          {t("guest_review_submitted")}
        </p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <HostBookings />
    </Suspense>
  );
}

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CalendarDays, Users, MessageSquare, X, CreditCard } from "lucide-react";
import ReviewForm from "@/components/ReviewForm";
import { cancelBooking, initiatePayment } from "./actions";

type Booking = {
  id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: string;
  conversation_id: string | null;
  listings: { id: string; title: string; city: string; country: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  approved: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  rejected: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function nights(checkIn: string, checkOut: string) {
  return Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
}

async function GuestBookings() {
  const [supabase, t] = await Promise.all([createClient(), getTranslations("guestBookings")]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const [{ data: bookings }, { data: myReviews }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, listings(id, title, city, country)")
      .eq("guest_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("booking_id")
      .eq("reviewer_id", user.id),
  ]);

  const reviewedBookingIds = new Set((myReviews ?? []).map((r) => r.booking_id));

  const reviewLabels = {
    title: t("review_title"),
    placeholder: t("review_placeholder"),
    submit: t("review_submit"),
    success: t("review_success"),
    error_rating: t("review_error_rating"),
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>

        {(!bookings || bookings.length === 0) ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Link href="/listings" className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition">
              {t("browse")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {(bookings as Booking[]).map((b) => {
              const n = nights(b.check_in, b.check_out);
              const isPast = b.check_out < today;
              const canReview = b.status === "confirmed" && isPast && !reviewedBookingIds.has(b.id);
              const canCancel = b.status === "pending";
              const needsPayment = b.status === "approved";

              return (
                <div key={b.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <Link href={`/listings/${b.listings?.id}`} className="font-medium hover:underline">
                        {b.listings?.title ?? "—"}
                      </Link>
                      <p className="text-sm text-muted-foreground">{b.listings?.city}, {b.listings?.country}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[b.status] ?? ""}`}>
                      {t(`status_${b.status}`)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <span>{b.check_in} → {b.check_out}</span>
                      <span className="text-foreground font-medium ml-1">({n} {t("nights")})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{b.guests_count} {t("guests")}</span>
                    </div>
                    <div className="font-semibold">€{Number(b.total_price).toLocaleString()}</div>
                  </div>

                  {needsPayment && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm text-blue-700 dark:text-blue-400">{t("payment_required_hint")}</p>
                      <form action={initiatePayment.bind(null, b.id)}>
                        <button className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition">
                          <CreditCard className="h-3.5 w-3.5" />
                          {t("pay_now")}
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    {b.conversation_id && (
                      <Link href={`/chat/${b.conversation_id}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t("open_chat")}
                      </Link>
                    )}

                    {canCancel && (
                      <form action={cancelBooking.bind(null, b.id)}>
                        <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition">
                          <X className="h-3.5 w-3.5" />
                          {t("cancel")}
                        </button>
                      </form>
                    )}
                  </div>

                  {canReview && b.listings?.id && (
                    <ReviewForm
                      bookingId={b.id}
                      listingId={b.listings.id}
                      labels={reviewLabels}
                    />
                  )}

                  {b.status === "confirmed" && isPast && reviewedBookingIds.has(b.id) && (
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                      {t("review_submitted")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <GuestBookings />
    </Suspense>
  );
}

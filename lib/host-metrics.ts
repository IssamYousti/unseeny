import { createAdminClient } from "@/lib/supabase/admin";

export type HostMetrics = {
  responseRate: number | null;     // 0–100 percentage, from message timing
  avgResponseHours: number | null; // avg hours to first reply
  totalConversations: number;
  // Booking stats
  totalBookings: number;           // confirmed bookings
  totalRevenue: number;            // sum of total_price for confirmed bookings
  // Review stats
  avgRating: number | null;        // avg rating from guest reviews of their listings
  reviewCount: number;             // number of listing reviews received
  avgGuestRating: number | null;   // avg rating hosts gave to guests (guest_reviews)
};

export async function computeHostMetrics(hostId: string): Promise<HostMetrics> {
  const admin = createAdminClient();

  const [
    { data: conversations },
    { data: confirmedBookings },
    { data: listingReviews },
    { data: guestReviewsGiven },
  ] = await Promise.all([
    admin.from("conversations").select("id, guest_id").eq("host_id", hostId),
    admin
      .from("bookings")
      .select("total_price")
      .eq("host_id", hostId)
      .eq("status", "confirmed"),
    admin
      .from("reviews")
      .select("rating")
      .in(
        "listing_id",
        // sub-select: all listing IDs owned by this host
        (await admin.from("listings").select("id").eq("host_id", hostId)).data?.map((l) => l.id) ?? [],
      ),
    admin.from("guest_reviews").select("rating").eq("host_id", hostId),
  ]);

  // ── Booking stats ──────────────────────────────────────────────────────────
  const totalBookings = confirmedBookings?.length ?? 0;
  const totalRevenue = (confirmedBookings ?? []).reduce(
    (sum, b) => sum + Number(b.total_price),
    0,
  );

  // ── Review stats ───────────────────────────────────────────────────────────
  const ratings = (listingReviews ?? []).map((r) => r.rating);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;

  const guestRatings = (guestReviewsGiven ?? []).map((r) => r.rating);
  const avgGuestRating =
    guestRatings.length > 0
      ? guestRatings.reduce((s, r) => s + r, 0) / guestRatings.length
      : null;

  // ── Response rate (message timing) ────────────────────────────────────────
  if (!conversations || conversations.length === 0) {
    return {
      responseRate: null,
      avgResponseHours: null,
      totalConversations: 0,
      totalBookings,
      totalRevenue,
      avgRating,
      reviewCount: ratings.length,
      avgGuestRating,
    };
  }

  const convIds = conversations.map((c) => c.id);
  const guestById = new Map(conversations.map((c) => [c.id, c.guest_id]));

  const { data: messages } = await admin
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: true });

  if (!messages) {
    return {
      responseRate: null,
      avgResponseHours: null,
      totalConversations: conversations.length,
      totalBookings,
      totalRevenue,
      avgRating,
      reviewCount: ratings.length,
      avgGuestRating,
    };
  }

  const byConv = new Map<string, typeof messages>();
  for (const msg of messages) {
    if (!byConv.has(msg.conversation_id)) byConv.set(msg.conversation_id, []);
    byConv.get(msg.conversation_id)!.push(msg);
  }

  let replied = 0;
  let totalResponseMs = 0;
  let responseCount = 0;

  for (const conv of conversations) {
    const msgs = byConv.get(conv.id) ?? [];
    const guestId = guestById.get(conv.id)!;
    const firstGuestMsg = msgs.find((m) => m.sender_id === guestId);
    if (!firstGuestMsg) continue;
    const firstHostReply = msgs.find(
      (m) =>
        m.sender_id === hostId &&
        new Date(m.created_at) > new Date(firstGuestMsg.created_at),
    );
    if (firstHostReply) {
      replied++;
      totalResponseMs +=
        new Date(firstHostReply.created_at).getTime() -
        new Date(firstGuestMsg.created_at).getTime();
      responseCount++;
    }
  }

  return {
    responseRate:
      conversations.length > 0
        ? Math.round((replied / conversations.length) * 100)
        : null,
    avgResponseHours:
      responseCount > 0
        ? totalResponseMs / responseCount / (1000 * 60 * 60)
        : null,
    totalConversations: conversations.length,
    totalBookings,
    totalRevenue,
    avgRating,
    reviewCount: ratings.length,
    avgGuestRating,
  };
}

export function formatResponseTime(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "within 1 hour";
  if (hours < 2) return "within 2 hours";
  if (hours < 4) return "within 4 hours";
  if (hours < 8) return "within 8 hours";
  if (hours < 12) return "within 12 hours";
  if (hours < 24) return "within a day";
  if (hours < 48) return "within 2 days";
  return "within a few days";
}

export function computeHostingYears(
  hostingSince: string | null | undefined,
  firstListingDate: string | null | undefined,
): number | null {
  const raw = hostingSince ?? firstListingDate;
  if (!raw) return null;
  const ms = Date.now() - new Date(raw).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25)));
}

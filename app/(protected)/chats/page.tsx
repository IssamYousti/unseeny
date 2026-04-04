import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  MessageSquare,
  CalendarClock,
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  ExternalLink,
} from "lucide-react";

export default async function ChatsPage() {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user!;

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, listing_id, guest_id, host_id, created_at, listings(id, title)")
    .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (!convs || convs.length === 0) {
    return (
      <main className="bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your conversations with guests and hosts
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        </div>
      </main>
    );
  }

  const convIds = convs.map((c) => c.id);
  const otherPartyIds = [
    ...new Set(convs.map((c) => (c.guest_id === user.id ? c.host_id : c.guest_id))),
  ];

  const [
    { data: lastMessages },
    { data: reads },
    { data: profiles },
    { data: bookings },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("conversation_id, content, sender_id, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversation_reads")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id)
      .in("conversation_id", convIds),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", otherPartyIds),
    supabase
      .from("bookings")
      .select("id, conversation_id, status, check_in, check_out, guests_count, total_price, created_at")
      .in("conversation_id", convIds),
  ]);

  // Fallback email lookup for users without profiles
  let emailMap: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const results = await Promise.all(
      otherPartyIds.map((id) => admin.auth.admin.getUserById(id)),
    );
    emailMap = Object.fromEntries(
      otherPartyIds.map((id, i) => [id, results[i].data.user?.email ?? ""]),
    );
  } catch {
    /* non-fatal */
  }

  // ── Maps ─────────────────────────────────────────────────────────────
  const lastMessageMap: Record<
    string,
    { content: string; sender_id: string; created_at: string }
  > = {};
  for (const msg of lastMessages ?? []) {
    if (!lastMessageMap[msg.conversation_id]) lastMessageMap[msg.conversation_id] = msg;
  }

  const readMap = Object.fromEntries(
    (reads ?? []).map((r) => [r.conversation_id, r.last_read_at]),
  );

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || "",
    ]),
  );

  const bookingMap = Object.fromEntries(
    (bookings ?? []).map((b) => [b.conversation_id, b]),
  );

  function getOtherPartyId(conv: NonNullable<typeof convs>[0]) {
    return conv.guest_id === user.id ? conv.host_id : conv.guest_id;
  }

  function getOtherPartyName(conv: NonNullable<typeof convs>[0]): string {
    const otherId = getOtherPartyId(conv);
    if (profileMap[otherId]) return profileMap[otherId];
    const email = emailMap[otherId];
    return email ? email.split("@")[0] : "Unknown";
  }

  function getOtherPartyRole(conv: NonNullable<typeof convs>[0]): "host" | "guest" {
    return conv.guest_id === user.id ? "host" : "guest";
  }

  function isUnread(convId: string): boolean {
    const lastMsg = lastMessageMap[convId];
    if (!lastMsg || lastMsg.sender_id === user.id) return false;
    const readAt = readMap[convId];
    return !readAt || new Date(lastMsg.created_at) > new Date(readAt);
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0)
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const sortedConvs = [...convs].sort((a, b) => {
    const aTime = lastMessageMap[a.id]?.created_at ?? a.created_at;
    const bTime = lastMessageMap[b.id]?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const unreadCount = sortedConvs.filter((c) => isUnread(c.id)).length;

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sortedConvs.length} {sortedConvs.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Conversation list */}
        <div className="space-y-3">
          {sortedConvs.map((conv) => {
            const lastMsg = lastMessageMap[conv.id];
            const unread = isUnread(conv.id);
            const otherName = getOtherPartyName(conv);
            const otherId = getOtherPartyId(conv);
            const otherRole = getOtherPartyRole(conv);
            const initial = (otherName || "?").charAt(0).toUpperCase();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const listing = conv.listings as any;
            const listingTitle = listing?.title ?? "Unknown property";
            const listingId = listing?.id ?? null;
            const booking = bookingMap[conv.id] ?? null;
            const profileHref = otherRole === "host" ? `/hosts/${otherId}` : `/guests/${otherId}`;

            return (
              <div
                key={conv.id}
                className={`bg-card border rounded-2xl overflow-hidden transition-all hover:shadow-md ${
                  unread ? "border-primary/30 shadow-sm shadow-primary/5" : "border-border"
                }`}
              >
                {/* Main conversation link */}
                <Link href={`/chat/${conv.id}`} className="block p-5">
                  <div className="flex items-start gap-4">

                    {/* Avatar */}
                    <div
                      className={`relative h-12 w-12 rounded-xl flex items-center justify-center text-base font-bold shrink-0 select-none ${
                        unread
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {initial}
                      {unread && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">

                      {/* Top row: name + time */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                          className={`text-sm truncate ${
                            unread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                          }`}
                        >
                          {otherName || "Unknown"}
                        </span>
                        {lastMsg && (
                          <span
                            className={`text-xs shrink-0 tabular-nums ${
                              unread ? "text-primary font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(lastMsg.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Listing name */}
                      <p className="text-xs text-muted-foreground/70 truncate leading-tight">
                        {listingTitle}
                      </p>

                      {/* Last message */}
                      {lastMsg ? (
                        <p
                          className={`text-sm mt-2 truncate leading-snug ${
                            unread ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {lastMsg.sender_id === user.id && (
                            <span className="text-muted-foreground/60 font-normal">You: </span>
                          )}
                          {lastMsg.content}
                        </p>
                      ) : (
                        <p className="text-sm mt-2 text-muted-foreground/40 italic">
                          No messages yet
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                {/* ── Context strip: booking + profile links ──────────── */}
                <div className="border-t border-border/60 bg-muted/20 px-5 py-3 flex items-center gap-3 flex-wrap">

                  {/* Booking status */}
                  {booking ? (
                    <BookingBadge status={booking.status} />
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">No booking request</span>
                  )}

                  {/* Booking request date */}
                  {booking && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="h-3 w-3 shrink-0" />
                      <span>
                        Requested {formatDate(booking.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Booking dates */}
                  {booking && (
                    <div className="text-xs text-muted-foreground">
                      {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Profile link */}
                  <Link
                    href={profileHref}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View {otherRole === "host" ? "host" : "guest"} profile
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}

function BookingBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    pending: {
      label: "Pending",
      icon: <Clock className="h-3 w-3" />,
      cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    confirmed: {
      label: "Confirmed",
      icon: <CheckCircle2 className="h-3 w-3" />,
      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    rejected: {
      label: "Declined",
      icon: <XCircle className="h-3 w-3" />,
      cls: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    cancelled: {
      label: "Cancelled",
      icon: <MinusCircle className="h-3 w-3" />,
      cls: "bg-muted text-muted-foreground border-border",
    },
  };
  const item = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${item.cls}`}
    >
      {item.icon}
      {item.label}
    </span>
  );
}

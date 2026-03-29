import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function ChatsPage() {
  const [supabase, t] = await Promise.all([createClient(), getTranslations("chats")]);
  const user = (await supabase.auth.getUser()).data.user!;

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, listing_id, guest_id, host_id, created_at, listings(title)")
    .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (!convs || convs.length === 0) {
    return (
      <main className="bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
          </div>
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        </div>
      </main>
    );
  }

  const convIds = convs.map((c) => c.id);
  const otherPartyIds = [...new Set(
    convs.map((c) => c.guest_id === user.id ? c.host_id : c.guest_id)
  )];

  const [{ data: lastMessages }, { data: reads }, { data: profiles }] = await Promise.all([
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
  ]);

  const lastMessageMap: Record<string, { content: string; sender_id: string; created_at: string }> = {};
  for (const msg of lastMessages ?? []) {
    if (!lastMessageMap[msg.conversation_id]) {
      lastMessageMap[msg.conversation_id] = msg;
    }
  }

  const readMap = Object.fromEntries(
    (reads ?? []).map((r) => [r.conversation_id, r.last_read_at])
  );

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || "",
    ])
  );

  let emailMap: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const results = await Promise.all(
      otherPartyIds.map((id) => admin.auth.admin.getUserById(id))
    );
    emailMap = Object.fromEntries(
      otherPartyIds.map((id, i) => [id, results[i].data.user?.email ?? ""])
    );
  } catch { /* non-fatal */ }

  function getOtherPartyName(conv: NonNullable<typeof convs>[0]): string {
    const otherId = conv.guest_id === user.id ? conv.host_id : conv.guest_id;
    if (profileMap[otherId]) return profileMap[otherId];
    const email = emailMap[otherId];
    return email ? email.split("@")[0] : t("anonymous");
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
    if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  // Sort conversations by last message time (most recent first)
  const sortedConvs = [...convs].sort((a, b) => {
    const aTime = lastMessageMap[a.id]?.created_at ?? a.created_at;
    const bTime = lastMessageMap[b.id]?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const unreadCount = sortedConvs.filter((c) => isUnread(c.id)).length;

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Conversation list */}
        <div className="divide-y divide-border/50">
          {sortedConvs.map((conv) => {
            const lastMsg = lastMessageMap[conv.id];
            const unread = isUnread(conv.id);
            const otherName = getOtherPartyName(conv);
            const initial = otherName.charAt(0).toUpperCase();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const listingTitle = (conv.listings as any)?.title ?? t("unknown_listing");

            return (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="flex items-center gap-4 py-4 group transition-colors hover:bg-muted/30 -mx-3 px-3 rounded-xl"
              >
                {/* Avatar */}
                <div className={`relative h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 select-none transition-transform group-hover:scale-105 ${
                  unread
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {initial}
                  {unread && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                  )}
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                      {otherName}
                    </span>
                    {lastMsg && (
                      <span className={`text-xs shrink-0 tabular-nums ${unread ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {formatTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground/60 truncate mt-0.5 leading-tight">
                    {listingTitle}
                  </p>

                  {lastMsg ? (
                    <p className={`text-sm mt-1 truncate leading-snug ${unread ? "text-foreground" : "text-muted-foreground"}`}>
                      {lastMsg.sender_id === user.id && (
                        <span className="text-muted-foreground/60">{t("you")}: </span>
                      )}
                      {lastMsg.content}
                    </p>
                  ) : (
                    <p className="text-sm mt-1 text-muted-foreground/40 italic">No messages yet</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </main>
  );
}

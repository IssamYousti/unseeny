import Navbar from "@/components/Navigationbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

/**
 * Semi-public layout — accessible to everyone.
 * Authenticated users get the full navbar with badge counts.
 * Unauthenticated users get the basic navbar.
 * No redirect in either direction.
 */
export default async function SemiPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar authenticated={false} />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    );
  }

  // Authenticated — fetch navbar data (same as protected layout)
  const [{ data: role }, { data: convs }] = await Promise.all([
    supabase.from("roles").select("is_admin, is_approved_host").eq("user_id", user.id).single(),
    supabase.from("conversations").select("id").or(`guest_id.eq.${user.id},host_id.eq.${user.id}`),
  ]);

  const isAdmin = role?.is_admin ?? false;
  const isHost = role?.is_approved_host ?? false;
  const convIds = (convs ?? []).map((c) => c.id);

  const [unreadChats, pendingBookings, unreadNotifications] = await Promise.all([
    (async () => {
      if (convIds.length === 0) return 0;
      const [{ data: reads }, { data: latestMessages }] = await Promise.all([
        supabase
          .from("conversation_reads")
          .select("conversation_id, last_read_at")
          .eq("user_id", user.id)
          .in("conversation_id", convIds),
        supabase
          .from("messages")
          .select("conversation_id, created_at")
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      const readMap = Object.fromEntries(
        (reads ?? []).map((r) => [r.conversation_id, r.last_read_at]),
      );
      const unreadConvIds = new Set<string>();
      for (const msg of latestMessages ?? []) {
        if (unreadConvIds.has(msg.conversation_id)) continue;
        const readAt = readMap[msg.conversation_id];
        if (!readAt || new Date(msg.created_at) > new Date(readAt)) {
          unreadConvIds.add(msg.conversation_id);
        }
      }
      return unreadConvIds.size;
    })(),
    isHost
      ? supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("host_id", user.id)
          .eq("status", "pending")
          .then(({ count }) => count ?? 0)
      : Promise.resolve(0),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => count ?? 0),
  ]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar
        authenticated
        isAdmin={isAdmin}
        unreadChats={unreadChats}
        pendingBookings={pendingBookings}
        unreadNotifications={unreadNotifications}
      />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

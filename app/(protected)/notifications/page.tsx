import { createClient } from "@/lib/supabase/server";
import { Bell } from "lucide-react";
import NotificationItem from "./NotificationItem";
import { markNotificationsRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user!;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">Your recent activity and updates.</p>
          </div>
          {unreadCount > 0 && (
            <form action={markNotificationsRead}>
              <button type="submit" className="text-xs text-primary hover:underline transition">
                Mark all as read
              </button>
            </form>
          )}
        </div>

        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Bell className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationRead } from "./actions";
import { CalendarCheck, CalendarX, CheckCircle, Info } from "lucide-react";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationItem({ notification: n }: { notification: Notification }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) return;
    startTransition(async () => {
      if (!n.is_read) {
        await markNotificationRead(n.id);
      }
      if (n.link) {
        router.push(n.link);
      } else {
        router.refresh();
      }
    });
  }

  const icon = (() => {
    switch (n.type) {
      case "booking_request":   return <CalendarCheck className="h-4 w-4 text-primary" />;
      case "booking_confirmed": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "booking_rejected":  return <CalendarX className="h-4 w-4 text-rose-500" />;
      default:                  return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={`flex items-start gap-4 py-4 -mx-3 px-3 rounded-xl transition-colors cursor-pointer select-none
        ${!n.is_read ? "bg-primary/[0.04]" : ""}
        ${isPending ? "opacity-60 pointer-events-none" : "hover:bg-muted/40"}`}
    >
      <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
        !n.is_read ? "bg-primary/10" : "bg-muted"
      }`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`text-sm truncate ${!n.is_read ? "font-semibold" : "font-medium"}`}>
            {n.title}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(n.created_at)}
          </span>
        </div>
        {n.body && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
        )}
      </div>

      {!n.is_read && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </div>
  );
}

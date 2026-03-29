import { unstable_noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import {
  Users,
  Activity,
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
  Euro,
  Star,
  CalendarDays,
  BookOpen,
  UserCheck,
  BarChart3,
  Percent,
} from "lucide-react";
import { PLATFORM_FEE, platformFee, hostPayout } from "@/lib/config";

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function Overview() {
  unstable_noStore();

  const [supabase, t] = await Promise.all([createClient(), getTranslations("admin")]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: totalUsers },
    { data: activeUsers },
    { count: newUsersMonth },
    { count: totalListings },
    { count: approvedListings },
    { count: pendingListings },
    { data: allBookings },
    { data: confirmedBookings },
    { data: confirmedBookingsMonth },
    { count: totalReviews },
    { count: totalGuestReviews },
    { data: recentBookings },
    { data: recentApplications },
    { data: recentReviews },
  ] = await Promise.all([
    supabase.rpc("count_total_users"),
    supabase.rpc("count_active_users_7d"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", true),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false),
    supabase.from("bookings").select("status"),
    supabase
      .from("bookings")
      .select("total_price")
      .eq("status", "confirmed"),
    supabase
      .from("bookings")
      .select("total_price")
      .eq("status", "confirmed")
      .gte("created_at", startOfMonth),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("guest_reviews").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id, status, created_at, listings(title)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("host_applications")
      .select("id, full_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("reviews")
      .select("id, created_at, listings(title)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Booking status breakdown
  const statusCounts: Record<string, number> = {};
  for (const b of allBookings ?? []) {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  }
  const totalBookings = allBookings?.length ?? 0;

  // Revenue
  const totalGross = (confirmedBookings ?? []).reduce(
    (sum, b) => sum + (b.total_price ?? 0),
    0
  );
  const monthGross = (confirmedBookingsMonth ?? []).reduce(
    (sum, b) => sum + (b.total_price ?? 0),
    0
  );
  const totalPlatformRevenue = platformFee(totalGross);
  const monthPlatformRevenue = platformFee(monthGross);
  const totalHostPayouts = hostPayout(totalGross);
  const monthHostPayouts = hostPayout(monthGross);

  // Activity feed
  type ActivityItem = {
    id: string;
    type: "booking_created" | "booking_confirmed" | "application" | "review";
    description: string;
    created_at: string;
  };

  const activityItems: ActivityItem[] = [];

  for (const b of recentBookings ?? []) {
    const listing = b.listings as unknown as { title?: string } | null;
    const title = listing?.title ?? "Unknown listing";
    activityItems.push({
      id: `booking-${b.id}`,
      type: b.status === "confirmed" ? "booking_confirmed" : "booking_created",
      description:
        b.status === "confirmed"
          ? `${title} booking confirmed`
          : `New booking for ${title}`,
      created_at: b.created_at,
    });
  }

  for (const app of recentApplications ?? []) {
    activityItems.push({
      id: `app-${app.id}`,
      type: "application",
      description: `Host application from ${app.full_name}`,
      created_at: app.created_at,
    });
  }

  for (const r of recentReviews ?? []) {
    const listing = r.listings as unknown as { title?: string } | null;
    const title = listing?.title ?? "Unknown listing";
    activityItems.push({
      id: `review-${r.id}`,
      type: "review",
      description: `Review posted for ${title}`,
      created_at: r.created_at,
    });
  }

  activityItems.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const feed = activityItems.slice(0, 20);

  const activityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "booking_created":
        return <CalendarDays className="h-4 w-4 text-amber-500" />;
      case "booking_confirmed":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "application":
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case "review":
        return <Star className="h-4 w-4 text-purple-500" />;
    }
  };

  const metrics = [
    { title: t("metric_users"), value: totalUsers ?? 0, icon: Users },
    { title: t("metric_active"), value: activeUsers ?? 0, icon: Activity },
    { title: t("metric_new_users_month"), value: newUsersMonth ?? 0, icon: TrendingUp },
    { title: t("metric_listings"), value: totalListings ?? 0, icon: Building2 },
    { title: t("metric_approved"), value: approvedListings ?? 0, icon: CheckCircle },
    { title: t("metric_pending_listings"), value: pendingListings ?? 0, icon: Clock },
    { title: t("metric_total_bookings"), value: totalBookings, icon: BookOpen },
    { title: t("metric_pending_bookings"), value: statusCounts["pending"] ?? 0, icon: Clock },
    { title: t("metric_confirmed_bookings"), value: statusCounts["confirmed"] ?? 0, icon: CheckCircle },
    {
      title: t("metric_total_reviews"),
      value: (totalReviews ?? 0) + (totalGuestReviews ?? 0),
      icon: Star,
    },
  ];

  const revenueMetrics = [
    { title: t("metric_gross_total"), value: Math.round(totalGross), sub: t("metric_gross_total_sub"), icon: Euro, color: "text-foreground" },
    { title: t("metric_platform_total"), value: Math.round(totalPlatformRevenue), sub: `${(PLATFORM_FEE * 100).toFixed(0)}% fee`, icon: Percent, color: "text-primary" },
    { title: t("metric_host_total"), value: Math.round(totalHostPayouts), sub: t("metric_host_total_sub"), icon: Euro, color: "text-muted-foreground" },
    { title: t("metric_gross_month"), value: Math.round(monthGross), sub: t("metric_this_month"), icon: Euro, color: "text-foreground" },
    { title: t("metric_platform_month"), value: Math.round(monthPlatformRevenue), sub: t("metric_this_month"), icon: Percent, color: "text-primary" },
    { title: t("metric_host_month"), value: Math.round(monthHostPayouts), sub: t("metric_this_month"), icon: Euro, color: "text-muted-foreground" },
  ];

  const statusBarSegments = [
    { label: "Pending", key: "pending", color: "bg-amber-400" },
    { label: "Approved", key: "approved", color: "bg-blue-400" },
    { label: "Confirmed", key: "confirmed", color: "bg-emerald-500" },
    { label: "Rejected", key: "rejected", color: "bg-rose-500" },
    { label: "Cancelled", key: "cancelled", color: "bg-gray-400" },
  ];

  return (
    <div className="space-y-10">
      {/* Metric grid */}
      <section>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ title, value, icon: Icon }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">{title}</p>
                <p className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue breakdown */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t("revenue_title")} <span className="font-normal text-muted-foreground">({(PLATFORM_FEE * 100).toFixed(0)}% platform fee)</span></h2>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {revenueMetrics.map(({ title, value, sub, icon: Icon, color }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">{title}</p>
                <p className={`text-2xl font-semibold tabular-nums ${color}`}>€{value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booking status bar */}
      {totalBookings > 0 && (
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Booking status breakdown</h2>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {statusBarSegments.map(({ key, color }) => {
              const count = statusCounts[key] ?? 0;
              if (count === 0) return null;
              const pct = (count / totalBookings) * 100;
              return (
                <div
                  key={key}
                  className={`${color} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${key}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {statusBarSegments.map(({ key, label, color }) => {
              const count = statusCounts[key] ?? 0;
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {label}: <span className="font-semibold text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("activity_title")}</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">{t("no_data")}</p>
        ) : (
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {feed.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {activityIcon(item.type)}
                </div>
                <p className="text-sm flex-1">{item.description}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelative(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { Suspense } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";
import Link from "next/link";
import {
  Clock,
  XCircle,
  CheckCircle,
  MessageCircle,
  Timer,
  CalendarDays,
  Languages,
  Home,
  Star,
  PenLine,
  Euro,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { computeHostMetrics, computeHostingYears, formatResponseTime } from "@/lib/host-metrics";
import HostListingsGrid from "@/components/HostListingsGrid";
import { getNotificationPreferences } from "@/app/(protected)/listings/notify-actions";
import ListingAlertPreferences from "@/components/ListingAlertPreferences";

type Tab = "overview" | "stats" | "edit";

async function ProfilePage({ tab, applied }: { tab: Tab; applied: boolean }) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const [{ data: profile }, { data: role }, { data: hostApplication }, { data: listings }, { data: equipmentItems }, alertPrefs] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("roles").select("is_approved_host").eq("user_id", user.id).single(),
      supabase.from("host_applications").select("status, admin_notes").eq("user_id", user.id).maybeSingle(),
      supabase.from("listings").select("id, title, city, country, price_per_night, is_approved, is_archived, created_at, amenities").eq("host_id", user.id).order("created_at", { ascending: false }),
      supabase.from("equipment_items").select("key, name_en, category").eq("is_active", true).order("category").order("sort_order"),
      getNotificationPreferences(user.id),
    ]);

  const isApprovedHost = role?.is_approved_host === true;
  const p = profile ?? {};
  const displayName = [p.first_name, p.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "—";
  const initial = displayName.charAt(0).toUpperCase();
  const memberYear = new Date(user.created_at).getFullYear();

  const metrics = isApprovedHost ? await computeHostMetrics(user.id) : null;

  const approvedListings = (listings ?? []).filter((l) => l.is_approved);
  const firstListingDate = approvedListings.length > 0
    ? approvedListings[approvedListings.length - 1].created_at
    : null;
  const hostingYears = isApprovedHost
    ? computeHostingYears(p.hosting_since, firstListingDate)
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    ...(isApprovedHost ? [{ key: "stats" as Tab, label: "My Stats" }] : []),
    { key: "edit", label: "Edit profile" },
  ];

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-14 space-y-8">

        {/* Applied banner */}
        {applied && hostApplication?.status === "pending" && (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">Application submitted</p>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">We'll review your application and get back to you soon.</p>
            </div>
          </div>
        )}

        {/* ── Identity card ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary/60 via-primary to-primary/40" />
          <div className="p-8">
            <div className="flex items-start gap-6 flex-wrap sm:flex-nowrap">
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-3xl font-bold text-primary select-none">
                  {initial}
                </div>
                {isApprovedHost && (
                  <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                    <Home className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Member since {memberYear}</p>
                  </div>
                  <div className="shrink-0">
                    {isApprovedHost ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full bg-primary text-primary-foreground">
                        <Home className="h-3.5 w-3.5" />
                        Host
                      </span>
                    ) : hostApplication?.status === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="h-3 w-3" />
                        Application pending
                      </span>
                    ) : hostApplication?.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <XCircle className="h-3 w-3" />
                        Application rejected
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground border border-border">
                          Guest
                        </span>
                        <Link href="/become-host" className="text-xs text-primary hover:underline font-medium">
                          Become a host →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                {hostApplication?.status === "rejected" && hostApplication.admin_notes && (
                  <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-xl px-4 py-2.5">
                    <span className="font-medium text-foreground">Reason: </span>
                    {hostApplication.admin_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab nav ─────────────────────────────────────────────────────── */}
        {isApprovedHost && (
          <div className="flex gap-1 border-b border-border">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.key === "overview" ? "/profile" : `/profile?tab=${t.key}`}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                  tab === t.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── Overview tab ────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Host metrics strip */}
            {isApprovedHost && metrics && (
              <div className="grid grid-cols-3 gap-3">
                <MetricTile
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Years hosting"
                  value={hostingYears !== null ? (hostingYears < 1 ? "< 1" : String(hostingYears)) : "—"}
                />
                <MetricTile
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="Response rate"
                  value={metrics.responseRate !== null ? `${metrics.responseRate}%` : "—"}
                />
                <MetricTile
                  icon={<Timer className="h-4 w-4" />}
                  label="Responds"
                  value={formatResponseTime(metrics.avgResponseHours)}
                  small
                />
              </div>
            )}

            {/* Languages */}
            {isApprovedHost && (p.languages ?? []).length > 0 && (
              <div className="flex items-start gap-3">
                <Languages className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {(p.languages as string[]).map((lang) => (
                    <span key={lang} className="text-xs font-medium px-3 py-1 rounded-full bg-muted border border-border text-foreground">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Host bio */}
            {isApprovedHost && p.host_bio && (
              <div className="pt-1 border-t border-border">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p.host_bio}</p>
              </div>
            )}

            {/* My properties */}
            {isApprovedHost && (listings ?? []).length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">My properties</h2>
                  <div className="flex items-center gap-3">
                    <Link href="/listings/bookings" className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition">
                      Bookings
                    </Link>
                    <Link href="/listings/manage" className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition">
                      + Add property
                    </Link>
                  </div>
                </div>
                <HostListingsGrid listings={listings ?? []} />
              </section>
            )}

            {isApprovedHost && (listings ?? []).length === 0 && (
              <div className="text-center py-10 border border-dashed border-border rounded-2xl">
                <Home className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">You haven't created any listings yet.</p>
                <Link href="/listings/manage" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Create your first property →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Stats tab (host-only, private) ──────────────────────────────── */}
        {tab === "stats" && isApprovedHost && metrics && (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground/60">
              Visible only to you. Updated in real time.
            </p>

            {/* Top KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricTile
                icon={<BookOpen className="h-4 w-4" />}
                label="Confirmed stays"
                value={String(metrics.totalBookings)}
              />
              <MetricTile
                icon={<Euro className="h-4 w-4" />}
                label="Total revenue"
                value={`€${metrics.totalRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}`}
              />
              <MetricTile
                icon={<Star className="h-4 w-4" />}
                label="Avg listing rating"
                value={metrics.avgRating !== null ? metrics.avgRating.toFixed(1) : "—"}
              />
              <MetricTile
                icon={<BarChart3 className="h-4 w-4" />}
                label="Reviews received"
                value={String(metrics.reviewCount)}
              />
            </div>

            {/* Response metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricTile
                icon={<MessageCircle className="h-4 w-4" />}
                label="Response rate"
                value={metrics.responseRate !== null ? `${metrics.responseRate}%` : "—"}
              />
              <MetricTile
                icon={<Timer className="h-4 w-4" />}
                label="Avg response time"
                value={formatResponseTime(metrics.avgResponseHours)}
                small
              />
              <MetricTile
                icon={<CalendarDays className="h-4 w-4" />}
                label="Years hosting"
                value={hostingYears !== null ? (hostingYears < 1 ? "< 1 yr" : `${hostingYears} yr${hostingYears !== 1 ? "s" : ""}`) : "—"}
              />
            </div>

            {/* Guest reviews given */}
            {metrics.avgGuestRating !== null && (
              <div className="bg-muted/30 border border-border rounded-2xl px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Guest reviews you've written
                </p>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-base font-bold">{metrics.avgGuestRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">average rating given to guests</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Edit tab ────────────────────────────────────────────────────── */}
        {(tab === "edit" || !isApprovedHost) && (
          <section className="space-y-6">
            {isApprovedHost && (
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Edit profile
                </h2>
              </div>
            )}
            <ProfileForm profile={p} isHost={isApprovedHost} />

            {/* Listing alert preferences — visible to all users */}
            <ListingAlertPreferences
              initial={alertPrefs}
              equipmentItems={equipmentItems ?? []}
            />
          </section>
        )}

      </div>
    </main>
  );
}

function MetricTile({ icon, label, value, small }: { icon: ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-muted/40 border border-border rounded-2xl px-4 py-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-bold text-foreground ${small ? "text-base leading-tight" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const tab = (params.tab ?? "overview") as Tab;
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <ProfilePage tab={tab} applied={params.applied === "true"} />
    </Suspense>
  );
}

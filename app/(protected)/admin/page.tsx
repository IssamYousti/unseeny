import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Overview from "./_tabs/overview";
import Bookings from "./_tabs/bookings";
import Users from "./_tabs/users";
import Listings from "./_tabs/listings";
import Applications from "./_tabs/applications";
import Reviews from "./_tabs/reviews";

type SearchParams = Promise<{ tab?: string; status?: string }>;

async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const activeTab = params.tab ?? "overview";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: role } = await supabase
    .from("roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!role?.is_admin) redirect("/listings");

  const t = await getTranslations("admin");

  // Fetch badge counts in parallel
  const [pendingBookingsResult, pendingListingsResult, pendingApplicationsResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", false),
      supabase
        .from("host_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const pendingBookingsCount = pendingBookingsResult.count ?? 0;
  const pendingListingsCount = pendingListingsResult.count ?? 0;
  const pendingApplicationsCount = pendingApplicationsResult.count ?? 0;

  const tabs = [
    { key: "overview", label: t("tab_overview"), badge: 0 },
    { key: "bookings", label: t("tab_bookings"), badge: pendingBookingsCount },
    { key: "users", label: t("tab_users"), badge: 0 },
    { key: "listings", label: t("tab_listings"), badge: pendingListingsCount },
    { key: "applications", label: t("tab_applications"), badge: pendingApplicationsCount },
    { key: "reviews", label: t("tab_reviews"), badge: 0 },
  ] as const;

  return (
    <main className="bg-background min-h-screen">
      {/* Sticky tab navigation */}
      <div className="sticky top-16 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const href =
                tab.key === "overview"
                  ? "/admin"
                  : `/admin?tab=${tab.key}`;
              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                  {tab.badge > 0 && (
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none ${
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted-foreground text-sm">
              {t("loading")}
            </div>
          }
        >
          {activeTab === "overview" && <Overview />}
          {activeTab === "bookings" && <Bookings status={params.status} />}
          {activeTab === "users" && <Users />}
          {activeTab === "listings" && <Listings status={params.status} />}
          {activeTab === "applications" && <Applications />}
          {activeTab === "reviews" && <Reviews />}
        </Suspense>
      </div>
    </main>
  );
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <AdminPage searchParams={searchParams} />;
}

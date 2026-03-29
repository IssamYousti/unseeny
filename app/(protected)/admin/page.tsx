import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { approveListing } from "./actions";
import { redirect } from "next/navigation";
import { unstable_noStore } from "next/cache";

async function AdminDashboard() {
  unstable_noStore();

  const supabase = await createClient();

  // 🔐 AUTH CHECK
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // 🔐 ADMIN CHECK
  const { data: role } = await supabase
    .from("roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!role?.is_admin) redirect("/protected/listings");

  // --- METRICS ---

  const { data: totalUsers } = await supabase.rpc("count_total_users");
  const { data: activeUsers } = await supabase.rpc("count_active_users_7d");

  const { count: totalListings } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true });

  const { count: approvedListings } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("is_approved", true);

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, city, country, host_id, is_approved, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        <h1 className="text-3xl font-semibold tracking-tight">
          Admin dashboard
        </h1>

        {/* METRICS */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total users" value={totalUsers ?? 0} />
          <MetricCard title="Active users (7 days)" value={activeUsers ?? 0} />
          <MetricCard title="Total listings" value={totalListings ?? 0} />
          <MetricCard title="Approved listings" value={approvedListings ?? 0} />
        </section>

        {/* LISTINGS TABLE */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Pending listings</h2>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">City</th>
                  <th className="text-left px-4 py-3">Country</th>
                  <th className="text-left px-4 py-3">Host</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>

              <tbody>
                {listings?.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.country}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.host_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-orange-500 font-medium">Pending</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <form action={approveListing.bind(null, l.id)}>
                        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs hover:opacity-90">
                          Approve
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-1">
      <p className="text-muted-foreground text-sm">{title}</p>
      <p className="text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10">Loading dashboard...</div>}>
      <AdminDashboard />
    </Suspense>
  );
}

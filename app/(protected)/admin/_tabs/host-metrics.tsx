import { unstable_noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Star, BookOpen, Euro, MessageCircle, Users } from "lucide-react";

type HostRow = {
  id: string;
  name: string;
  email: string;
  listingCount: number;
  confirmedBookings: number;
  totalRevenue: number;
  avgRating: number | null;
  reviewCount: number;
  responseRate: number | null;
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-right">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function HostMetrics() {
  unstable_noStore();
  const admin = createAdminClient();

  // Fetch all approved hosts (profiles where roles.is_approved_host = true)
  const { data: hostRoles } = await admin
    .from("roles")
    .select("user_id")
    .eq("is_approved_host", true);

  const hostIds = (hostRoles ?? []).map((r) => r.user_id);

  if (hostIds.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground text-sm">
        No approved hosts yet.
      </div>
    );
  }

  // Fetch all data in parallel
  const [
    { data: profiles },
    { data: authUsers },
    { data: listings },
    { data: confirmedBookings },
    { data: listingReviews },
    { data: conversations },
    { data: messages },
  ] = await Promise.all([
    admin.from("profiles").select("id, first_name, last_name").in("id", hostIds),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("listings").select("id, host_id").in("host_id", hostIds),
    admin.from("bookings").select("host_id, total_price").in("host_id", hostIds).eq("status", "confirmed"),
    admin.from("reviews").select("listing_id, rating"),
    admin.from("conversations").select("id, host_id, guest_id").in("host_id", hostIds),
    admin.from("messages").select("conversation_id, sender_id, created_at").order("created_at", { ascending: true }),
  ]);

  // Build lookup indexes
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  // listing_id → host_id
  const listingHostMap = new Map((listings ?? []).map((l) => [l.id, l.host_id]));
  // host_id → listing count
  const listingCountMap = new Map<string, number>();
  for (const l of listings ?? []) {
    listingCountMap.set(l.host_id, (listingCountMap.get(l.host_id) ?? 0) + 1);
  }

  // Booking stats per host
  const bookingCountMap = new Map<string, number>();
  const revenueMap = new Map<string, number>();
  for (const b of confirmedBookings ?? []) {
    bookingCountMap.set(b.host_id, (bookingCountMap.get(b.host_id) ?? 0) + 1);
    revenueMap.set(b.host_id, (revenueMap.get(b.host_id) ?? 0) + Number(b.total_price));
  }

  // Review stats per host
  const ratingsByHost = new Map<string, number[]>();
  for (const r of listingReviews ?? []) {
    const hostId = listingHostMap.get(r.listing_id);
    if (!hostId) continue;
    if (!ratingsByHost.has(hostId)) ratingsByHost.set(hostId, []);
    ratingsByHost.get(hostId)!.push(r.rating);
  }

  // Response rate per host
  const convsByHost = new Map<string, typeof conversations>([]);
  for (const c of conversations ?? []) {
    if (!convsByHost.has(c.host_id)) convsByHost.set(c.host_id, []);
    convsByHost.get(c.host_id)!.push(c);
  }

  const msgsByConv = new Map<string, typeof messages>([]);
  for (const m of messages ?? []) {
    if (!msgsByConv.has(m.conversation_id)) msgsByConv.set(m.conversation_id, []);
    msgsByConv.get(m.conversation_id)!.push(m);
  }

  function responseRateFor(hostId: string): number | null {
    const convs = convsByHost.get(hostId) ?? [];
    if (convs.length === 0) return null;
    let replied = 0;
    for (const conv of convs) {
      const msgs = msgsByConv.get(conv.id) ?? [];
      const firstGuest = msgs.find((m) => m.sender_id === conv.guest_id);
      if (!firstGuest) continue;
      const hostReplied = msgs.find(
        (m) => m.sender_id === hostId && new Date(m.created_at) > new Date(firstGuest.created_at),
      );
      if (hostReplied) replied++;
    }
    return Math.round((replied / convs.length) * 100);
  }

  // Build final host rows, sorted by revenue desc
  const rows: HostRow[] = hostIds.map((id) => {
    const prof = profileMap.get(id);
    const ratings = ratingsByHost.get(id) ?? [];
    return {
      id,
      name: [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") || "—",
      email: emailMap.get(id) ?? "—",
      listingCount: listingCountMap.get(id) ?? 0,
      confirmedBookings: bookingCountMap.get(id) ?? 0,
      totalRevenue: revenueMap.get(id) ?? 0,
      avgRating: ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null,
      reviewCount: ratings.length,
      responseRate: responseRateFor(id),
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const totalBookings = rows.reduce((s, r) => s + r.confirmedBookings, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Host Performance</h2>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} approved host{rows.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Platform totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Users className="h-4 w-4" />, label: "Approved hosts", value: String(rows.length) },
          { icon: <BookOpen className="h-4 w-4" />, label: "Total confirmed stays", value: String(totalBookings) },
          { icon: <Euro className="h-4 w-4" />, label: "Total GMV", value: `€${totalRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}` },
          { icon: <Star className="h-4 w-4" />, label: "Hosts with reviews", value: String(rows.filter((r) => r.reviewCount > 0).length) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-muted/40 border border-border rounded-2xl px-4 py-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              {kpi.icon}
              <span className="text-xs font-medium uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Per-host table */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Host</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="flex items-center justify-end gap-1"><BookOpen className="h-3 w-3" /> Bookings</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="flex items-center justify-end gap-1"><Euro className="h-3 w-3" /> Revenue</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="flex items-center justify-end gap-1"><Star className="h-3 w-3" /> Rating</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="flex items-center justify-end gap-1"><MessageCircle className="h-3 w-3" /> Response</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Listings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((host) => (
                <tr key={host.id} className="hover:bg-muted/20 transition">
                  <td className="px-4 py-3">
                    <Link href={`/hosts/${host.id}`} className="font-medium hover:underline">
                      {host.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{host.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Stat value={String(host.confirmedBookings)} />
                  </td>
                  <td className="px-4 py-3">
                    <Stat
                      value={`€${host.totalRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {host.avgRating !== null ? (
                      <Stat
                        value={host.avgRating.toFixed(1)}
                        sub={`${host.reviewCount} review${host.reviewCount !== 1 ? "s" : ""}`}
                      />
                    ) : (
                      <Stat value="—" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Stat value={host.responseRate !== null ? `${host.responseRate}%` : "—"} />
                  </td>
                  <td className="px-4 py-3">
                    <Stat value={String(host.listingCount)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

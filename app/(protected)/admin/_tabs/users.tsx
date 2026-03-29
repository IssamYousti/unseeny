import { unstable_noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function Users() {
  unstable_noStore();

  const [supabase, t] = await Promise.all([createClient(), getTranslations("admin")]);

  const [
    { data: profiles },
    { data: roles },
    { data: bookings },
    { data: listings },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("roles")
      .select("user_id, is_admin, is_approved_host"),
    supabase
      .from("bookings")
      .select("guest_id"),
    supabase
      .from("listings")
      .select("host_id"),
  ]);

  // Build lookup maps
  const rolesMap = new Map<string, { is_admin: boolean; is_approved_host: boolean }>();
  for (const r of roles ?? []) {
    rolesMap.set(r.user_id, {
      is_admin: r.is_admin ?? false,
      is_approved_host: r.is_approved_host ?? false,
    });
  }

  const bookingCountByUser = new Map<string, number>();
  for (const b of bookings ?? []) {
    bookingCountByUser.set(b.guest_id, (bookingCountByUser.get(b.guest_id) ?? 0) + 1);
  }

  const listingCountByHost = new Map<string, number>();
  for (const l of listings ?? []) {
    listingCountByHost.set(l.host_id, (listingCountByHost.get(l.host_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("users_title")}</h1>

      {!profiles || profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10">{t("no_data")}</p>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">{t("col_joined")}</th>
                  <th className="text-left px-4 py-3">{t("col_role")}</th>
                  <th className="text-left px-4 py-3">Listings</th>
                  <th className="text-left px-4 py-3">{t("col_bookings_count")}</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const role = rolesMap.get(p.id);
                  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
                  const bookingCount = bookingCountByUser.get(p.id) ?? 0;
                  const listingCount = listingCountByHost.get(p.id) ?? 0;

                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div>{fullName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {role?.is_admin && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              {t("role_admin")}
                            </span>
                          )}
                          {role?.is_approved_host && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {t("role_host")}
                            </span>
                          )}
                          {!role?.is_admin && !role?.is_approved_host && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                              {t("role_guest")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {listingCount > 0 ? listingCount : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {bookingCount > 0 ? bookingCount : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";
import MyListings from "./MyListings";
import Link from "next/link";
import { Clock, XCircle, CheckCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

async function ProfilePage({ applied }: { applied: boolean }) {
  const [supabase, t] = await Promise.all([
    createClient(),
    getTranslations("profile"),
  ]);

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const [{ data: profile }, { data: role }, { data: hostApplication }, { data: listings }] =
    await Promise.all([
      supabase.from("profiles").select().eq("id", user.id).single(),
      supabase.from("roles").select("is_approved_host").eq("user_id", user.id).single(),
      supabase.from("host_applications").select("status, admin_notes").eq("user_id", user.id).maybeSingle(),
      supabase.from("listings").select().eq("host_id", user.id).order("created_at", { ascending: false }),
    ]);

  const isApprovedHost = role?.is_approved_host === true;
  const p = profile || {};
  const displayName = [p.first_name, p.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "—";
  const initial = displayName.charAt(0).toUpperCase();
  const memberYear = new Date(user.created_at).getFullYear();

  const formLabels = {
    username: t("field_username"),
    first_name: t("field_first_name"),
    last_name: t("field_last_name"),
    dob: t("field_dob"),
    save: t("save"),
    saved: t("saved"),
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-12">

        {/* Applied banner */}
        {applied && hostApplication?.status === "pending" && (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 -mt-4">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">{t("applied_title")}</p>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">{t("applied_desc")}</p>
            </div>
          </div>
        )}

        {/* Avatar + identity header */}
        <header className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary shrink-0 select-none">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{t("member_since")} {memberYear}</p>
          </div>

          {/* Host status */}
          <div className="ml-auto shrink-0">
            {isApprovedHost && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {t("role_host")}
              </span>
            )}
            {!isApprovedHost && hostApplication?.status === "pending" && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Clock className="h-3 w-3" />
                {t("pending_badge")}
              </span>
            )}
            {!isApprovedHost && hostApplication?.status === "rejected" && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <XCircle className="h-3 w-3" />
                {t("rejected_badge")}
              </span>
            )}
            {!isApprovedHost && !hostApplication && (
              <Link
                href="/become-host"
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
              >
                {t("become_host")}
              </Link>
            )}
          </div>
        </header>

        {/* Divider */}
        <hr className="border-border" />

        {/* Personal information */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
            {t("section_personal")}
          </h2>
          <ProfileForm profile={p} labels={formLabels} />
        </section>

        {/* Host listings */}
        {isApprovedHost && (
          <>
            <hr className="border-border" />
            <MyListings listings={listings || []} />
          </>
        )}

      </div>
    </main>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <ProfilePage applied={params.applied === "true"} />
    </Suspense>
  );
}

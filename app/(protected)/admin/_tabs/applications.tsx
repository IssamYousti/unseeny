import { unstable_noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { approveHostApplication, rejectHostApplication } from "../actions";
import { CheckCircle, XCircle, Clock, User, Phone, MapPin, Building2 } from "lucide-react";

type Application = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
  property_description: string;
  privacy_guarantee: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function ApplicationCard({
  app,
  t,
  approveAction,
  rejectAction,
  readonly = false,
}: {
  app: Application;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  approveAction?: () => Promise<void>;
  rejectAction?: () => Promise<void>;
  readonly?: boolean;
}) {
  const statusConfig =
    {
      pending: {
        label: t("status_pending"),
        color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
        dot: "bg-amber-500",
      },
      approved: {
        label: t("status_approved"),
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        dot: "bg-emerald-500",
      },
      rejected: {
        label: t("status_rejected"),
        color: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
        dot: "bg-red-500",
      },
    }[app.status] ?? {
      label: app.status,
      color: "text-muted-foreground bg-muted border-border",
      dot: "bg-muted-foreground",
    };

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden ${
        app.status === "pending" ? "border-amber-500/30" : "border-border"
      }`}
    >
      <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{app.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {t("app_applied")}{" "}
              {new Date(app.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {app.phone}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {app.country}
          </span>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> {t("app_property")}
            </p>
            <p className="text-sm leading-relaxed">{app.property_description}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3" /> {t("app_privacy")}
            </p>
            <p className="text-sm leading-relaxed">{app.privacy_guarantee}</p>
          </div>
          {app.admin_notes && (
            <div className="bg-muted/50 rounded-xl px-3 py-2.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t("app_admin_notes")}</p>
              <p className="text-sm">{app.admin_notes}</p>
            </div>
          )}
        </div>
      </div>

      {!readonly && approveAction && rejectAction && (
        <div className="px-5 py-4 border-t border-border bg-muted/30 flex items-center gap-3">
          <form action={approveAction}>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition">
              <CheckCircle className="h-4 w-4" /> {t("approve_host")}
            </button>
          </form>
          <form action={rejectAction}>
            <button className="flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition">
              <XCircle className="h-4 w-4 text-muted-foreground" /> {t("reject")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function Applications() {
  unstable_noStore();

  const [supabase, t] = await Promise.all([createClient(), getTranslations("admin")]);

  const { data: hostApplications } = await supabase
    .from("host_applications")
    .select(
      "id, user_id, full_name, phone, country, property_description, privacy_guarantee, status, admin_notes, created_at, reviewed_at"
    )
    .order("created_at", { ascending: false });

  const pendingApplications = hostApplications?.filter((a) => a.status === "pending") ?? [];
  const reviewedApplications = hostApplications?.filter((a) => a.status !== "pending") ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("applications_title")}</h1>
        {pendingApplications.length > 0 && (
          <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium px-3 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {pendingApplications.length} {t("status_pending").toLowerCase()}
          </span>
        )}
      </div>

      {pendingApplications.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">{t("applications_empty")}</p>
      ) : (
        <div className="space-y-4">
          {pendingApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              t={t}
              approveAction={approveHostApplication.bind(null, app.id, app.user_id)}
              rejectAction={rejectHostApplication.bind(null, app.id)}
            />
          ))}
        </div>
      )}

      {reviewedApplications.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2 py-1">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
            {t("show_reviewed", { count: reviewedApplications.length })}
          </summary>
          <div className="mt-4 space-y-3">
            {reviewedApplications.map((app) => (
              <ApplicationCard key={app.id} app={app} t={t} readonly />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

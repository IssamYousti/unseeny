import { unstable_noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  adminAddBlacklistItem,
  adminToggleBlacklistItem,
  adminDeleteBlacklistItem,
  adminReviewViolation,
} from "../actions";
import { ShieldAlert, ShieldCheck, Clock } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  word: "Word",
  phrase: "Phrase",
  regex: "Regex",
  platform: "Platform",
};

const RULE_LABELS: Record<string, string> = {
  email: "Email address",
  phone: "Phone number",
  phone_spelled: "Spelled-out phone",
  whatsapp: "WhatsApp link",
  telegram: "Telegram link",
  url: "External URL",
  social: "Social media",
  handle: "@handle",
  "blacklist:word": "Blacklisted word",
  "blacklist:phrase": "Blacklisted phrase",
  "blacklist:platform": "Blacklisted platform",
  "blacklist:regex": "Blacklisted pattern",
};

function ruleLabel(rule: string) {
  return RULE_LABELS[rule] ?? rule;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function Moderation() {
  unstable_noStore();

  const admin = createAdminClient();
  const supabase = await createClient();

  const [
    { data: blacklist },
    { data: violations },
    { data: profiles },
  ] = await Promise.all([
    admin.from("chat_blacklist").select("*").order("type").order("value"),
    admin
      .from("chat_violations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, first_name, last_name"),
  ]);

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "User";
    profileMap.set(p.id, name);
  }

  const pendingViolations = (violations ?? []).filter((v) => !v.is_reviewed);
  const reviewedViolations = (violations ?? []).filter((v) => v.is_reviewed);

  // Group blacklist by type
  const grouped: Record<string, typeof blacklist> = {};
  for (const item of blacklist ?? []) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type]!.push(item);
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat moderation</h1>
        {pendingViolations.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1 rounded-full">
            <ShieldAlert className="h-4 w-4" />
            {pendingViolations.length} unreviewed {pendingViolations.length === 1 ? "violation" : "violations"}
          </span>
        )}
      </div>

      {/* ── Violations ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Violations log</h2>

        {violations?.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <ShieldCheck className="h-5 w-5" />
            No violations recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending first */}
            {pendingViolations.map((v) => (
              <div
                key={v.id}
                className="bg-card border border-amber-500/20 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Pending review
                      </span>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {ruleLabel(v.matched_rule)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {relativeTime(v.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {v.sender_id ? profileMap.get(v.sender_id) ?? "Unknown user" : "Unknown user"}
                      {v.conversation_id && (
                        <>
                          {" · "}
                          <Link
                            href={`/chat/${v.conversation_id}`}
                            className="text-primary hover:underline"
                          >
                            View conversation
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Blocked message */}
                <div className="bg-muted/50 rounded-xl px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Blocked message:</p>
                  <p className="text-sm break-words">{v.message_content}</p>
                  {v.matched_value && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Matched: <code className="bg-background px-1 py-0.5 rounded font-mono">{v.matched_value}</code>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <form action={adminReviewViolation.bind(null, v.id, "dismissed")}>
                    <button className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition">
                      Dismiss
                    </button>
                  </form>
                  <form action={adminReviewViolation.bind(null, v.id, "warned")}>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition">
                      Mark as warned
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {/* Reviewed */}
            {reviewedViolations.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition py-2">
                  Show {reviewedViolations.length} reviewed violation{reviewedViolations.length !== 1 ? "s" : ""}
                </summary>
                <div className="mt-3 space-y-2">
                  {reviewedViolations.map((v) => (
                    <div
                      key={v.id}
                      className="bg-card border border-border rounded-xl px-4 py-3 flex items-start justify-between gap-4 opacity-60"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {v.review_action === "dismissed" ? "Dismissed" : "Warned"}
                          </span>
                          <span className="text-muted-foreground">{ruleLabel(v.matched_rule)}</span>
                          <span className="text-muted-foreground">{relativeTime(v.created_at)}</span>
                        </div>
                        <p className="text-sm truncate text-muted-foreground">{v.message_content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      {/* ── Blacklist management ─────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Blacklist rules</h2>

        <p className="text-sm text-muted-foreground max-w-2xl">
          These rules are checked against every message in addition to the always-on technical patterns
          (email addresses, phone numbers, URLs) which cannot be disabled.
        </p>

        {/* Add item */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-4">Add rule</h3>
          <form action={adminAddBlacklistItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
              <select
                name="type"
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="word">Word</option>
                <option value="phrase">Phrase</option>
                <option value="platform">Platform name</option>
                <option value="regex">Regex pattern</option>
              </select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Value <span className="text-muted-foreground/60 font-normal">(case-insensitive)</span>
              </label>
              <input
                name="value"
                required
                placeholder='e.g. "kakao" or "(\d[\s.]){7,}\d" for regex'
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description (optional)</label>
              <input
                name="description"
                placeholder="Why this is blocked"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                Add rule
              </button>
            </div>
          </form>
        </div>

        {/* Grouped rule list */}
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold">
                {TYPE_LABELS[type] ?? type}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({(items ?? []).filter((i) => i.is_active).length} active)
                </span>
              </h3>
            </div>
            <div className="divide-y divide-border">
              {(items ?? []).map((item) => (
                <div key={item.id} className={`flex items-center justify-between px-4 py-3 gap-4 ${!item.is_active ? "opacity-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono">{item.value}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={adminToggleBlacklistItem.bind(null, item.id, !item.is_active)}>
                      <button
                        type="submit"
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          item.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {item.is_active ? "Active" : "Disabled"}
                      </button>
                    </form>
                    <form action={adminDeleteBlacklistItem.bind(null, item.id)}>
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground hover:text-destructive transition px-2 py-1 rounded hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Always-on notice */}
        <div className="bg-muted/40 border border-border rounded-2xl px-5 py-4">
          <p className="text-sm font-medium mb-2">Always-on technical patterns (not editable)</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              "Email addresses (user@domain.tld)",
              "Phone numbers (+31 6 12 34 56 78, etc.)",
              "Spaced-out digits (0 6 1 2 3 4 5 6 7 8)",
              "Spelled-out numbers (zero six one two…)",
              "HTTP/HTTPS URLs",
              "Domain mentions (example.com)",
              "Social media domains",
              "@platform handles",
              "WhatsApp / Telegram deep links",
            ].map((p) => (
              <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { Lock, Shield, Eye, CheckCircle, ArrowRight, Search, CalendarCheck, Sparkles, ClipboardList, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("home");

  return (
    <main className="min-h-screen bg-background">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left column */}
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
                {t("headline")}<br />
                <span className="text-primary">{t("headline_accent")}</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed">
                {t("description")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/listings"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-medium hover:opacity-90 transition"
              >
                {t("cta_browse")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center border border-border px-6 py-3.5 rounded-xl font-medium hover:bg-secondary transition"
              >
                {t("cta_secondary")}
              </a>
            </div>

          </div>

          {/* Right column — 2×2 placeholder grid */}
          <div className="relative grid grid-cols-2 gap-2 sm:gap-3">
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 to-secondary" />
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-secondary to-accent/20 mt-6" />
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 -mt-6" />
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/10 to-secondary" />

            {/* Privacy badge */}
            <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur border border-border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("privacy_badge")}</p>
                <p className="text-xs text-muted-foreground">{t("privacy_badge_sub")}</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="border-y border-border bg-secondary/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-10">

            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{t("trust_pool_title")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("trust_pool_desc")}</p>
            </div>

            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{t("trust_screened_title")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("trust_screened_desc")}</p>
            </div>

            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{t("trust_verified_title")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("trust_verified_desc")}</p>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-8 sm:mb-12">{t("how_title")}</h2>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">

          {/* ── For guests ── */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-6 sm:p-8 flex flex-col">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
                <Search className="h-3 w-3" />
                {t("how_guest_label")}
              </span>
            </div>

            <div className="flex-1 space-y-8">
              {[
                { n: "01", icon: Search,        title: t("guest_step1_title"), desc: t("guest_step1_desc") },
                { n: "02", icon: CalendarCheck, title: t("guest_step2_title"), desc: t("guest_step2_desc") },
                { n: "03", icon: Sparkles,      title: t("guest_step3_title"), desc: t("guest_step3_desc") },
              ].map(({ n, icon: Icon, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="shrink-0 text-2xl font-bold text-primary/20 w-8 leading-tight">{n}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold">{title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-border/60">
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition"
              >
                {t("guest_cta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ── For hosts ── */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-6 sm:p-8 flex flex-col">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground bg-foreground/8 border border-border px-3 py-1.5 rounded-full">
                <Star className="h-3 w-3" />
                {t("how_host_label")}
              </span>
            </div>

            <div className="flex-1 space-y-8">
              {[
                { n: "01", icon: ClipboardList, title: t("host_step1_title"), desc: t("host_step1_desc") },
                { n: "02", icon: CheckCircle,   title: t("host_step2_title"), desc: t("host_step2_desc") },
                { n: "03", icon: Star,          title: t("host_step3_title"), desc: t("host_step3_desc") },
              ].map(({ n, icon: Icon, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="shrink-0 text-2xl font-bold text-foreground/15 w-8 leading-tight">{n}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-foreground/50 shrink-0" />
                      <h3 className="font-semibold">{title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-border/60">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 border border-border bg-background px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition"
              >
                {t("host_cta_button")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* HOST CTA STRIP */}
      <section className="bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-primary-foreground">{t("host_cta_title")}</h2>
            <p className="text-primary-foreground/70 mt-1">{t("host_cta_desc")}</p>
          </div>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3.5 rounded-xl font-medium hover:opacity-90 transition flex-shrink-0"
          >
            <CheckCircle className="h-4 w-4" />
            {t("host_cta_button")}
          </Link>
        </div>
      </section>

    </main>
  );
}

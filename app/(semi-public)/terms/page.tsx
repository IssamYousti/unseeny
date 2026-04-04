import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_noStore } from "next/cache";
import { Shield, FileText } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions — Unseeny",
  description: "Read the Unseeny terms and conditions for hosts and guests.",
};

export default async function TermsPage() {
  unstable_noStore();
  const admin = createAdminClient();
  const { data: sections } = await admin
    .from("terms_sections")
    .select("id, title, content, sort_order")
    .order("sort_order", { ascending: true });

  const hasSections = (sections ?? []).length > 0;

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-12">

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Terms &amp; Conditions</h1>
          <p className="text-muted-foreground leading-relaxed">
            By using Unseeny, you agree to these terms. Please read them carefully before booking or listing a property.
          </p>
          <div className="h-px bg-border" />
        </div>

        {/* Sections */}
        {hasSections ? (
          <div className="space-y-10">
            {(sections ?? []).map((section, i) => (
              <section key={section.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
                </div>
                <div className="pl-9">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              Terms &amp; Conditions are being prepared. Check back soon.
            </p>
          </div>
        )}

        {/* Footer note */}
        {hasSections && (
          <div className="border-t border-border pt-8 text-xs text-muted-foreground/60 space-y-1">
            <p>These terms were last updated by the Unseeny team.</p>
            <p>Questions? Contact us through the platform.</p>
          </div>
        )}

      </div>
    </main>
  );
}

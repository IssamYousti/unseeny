import Link from "next/link";
import { Shield } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

          {/* Brand */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm tracking-tight">Unseeny</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              100% private property rentals — no overlooking neighbours, no shared spaces.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/listings" className="hover:text-foreground transition-colors">
              Browse listings
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/become-host" className="hover:text-foreground transition-colors">
              Become a host
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/60">
          <p>© {year} Unseeny. All rights reserved.</p>
          <p>Built for privacy. Built for trust.</p>
        </div>
      </div>
    </footer>
  );
}

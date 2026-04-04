"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, X, CalendarDays, MessageSquare, User, ShieldCheck, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { logout } from "@/lib/auth/logout";

type Props = {
  isAdmin: boolean;
  unreadChats: number;
  pendingBookings: number;
  locale: string;
  labels: {
    bookings: string;
    chats: string;
    profile: string;
    admin: string;
    logout: string;
  };
};

function Dot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-auto h-2 w-2 rounded-full bg-primary shrink-0" />
  );
}

export default function NavHamburger({ isAdmin, unreadChats, pendingBookings, locale, labels }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on route change (escape key)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        className="flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-2xl shadow-lg overflow-hidden z-50">
          <div className="py-1.5">

            <Link
              href="/bookings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              {labels.bookings}
              <Dot show={pendingBookings > 0} />
            </Link>

            <Link
              href="/chats"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              {labels.chats}
              <Dot show={unreadChats > 0} />
            </Link>

            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
            >
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              {labels.profile}
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
              >
                <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                {labels.admin}
              </Link>
            )}

            <div className="my-1.5 border-t border-border" />

            {/* Theme + Language inline */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-muted-foreground">Appearance</span>
              <div className="flex items-center gap-2">
                <LanguageSwitcher currentLocale={locale} />
                <ThemeToggle />
              </div>
            </div>

            <div className="my-1.5 border-t border-border" />

            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-muted transition text-left"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {labels.logout}
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

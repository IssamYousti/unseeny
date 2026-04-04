import Link from "next/link";
import Image from "next/image";
import { logout } from "@/lib/auth/logout";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import NavHamburger from "./NavHamburger";
import { Bell, Heart } from "lucide-react";

type Props = {
  authenticated?: boolean;
  isAdmin?: boolean;
  unreadChats?: number;
  pendingBookings?: number;
  unreadNotifications?: number;
};

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default async function Navbar({
  authenticated = false,
  isAdmin = false,
  unreadChats = 0,
  pendingBookings = 0,
  unreadNotifications = 0,
}: Props) {
  const t = await getTranslations("nav");
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/icon-purple.png" alt="" width={32} height={32} className="h-8 w-auto dark:hidden" priority />
          <Image src="/icon-white.png" alt="" width={32} height={32} className="h-8 w-auto hidden dark:block" priority />
          <Image src="/text-purple.png" alt="Unseeny" width={90} height={24} className="h-6 w-auto dark:hidden hidden sm:block" priority />
          <Image src="/text-white.png" alt="Unseeny" width={90} height={24} className="h-6 w-auto hidden dark:sm:block" priority />
        </Link>

        {/* Right side */}
        <nav className="flex items-center gap-2">
          {authenticated ? (
            <>
              {/* Always-visible primary link */}
              <Link
                href="/listings"
                className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition px-3 py-2 rounded-xl hover:bg-muted"
              >
                {t("browse")}
              </Link>

              {/* Icon strip */}
              <Link
                href="/favourites"
                className="flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-muted transition"
                title="Saved properties"
              >
                <Heart className="h-5 w-5" />
              </Link>

              <Link
                href="/notifications"
                className="relative flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <Badge count={unreadNotifications} />
              </Link>

              {/* Hamburger — everything else */}
              <NavHamburger
                isAdmin={isAdmin}
                unreadChats={unreadChats}
                pendingBookings={pendingBookings}
                locale={locale}
                labels={{
                  bookings: t("bookings"),
                  chats: t("chats"),
                  profile: t("profile"),
                  admin: t("admin"),
                  logout: t("logout"),
                }}
              />
            </>
          ) : (
            <>
              <Link href="/listings" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition px-3 py-2 rounded-xl hover:bg-muted">
                {t("browse")}
              </Link>
              <ThemeToggle />
              <LanguageSwitcher currentLocale={locale} />
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-2 rounded-xl hover:bg-muted">
                {t("login")}
              </Link>
              <Link
                href="/auth/sign-up"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition"
              >
                {t("signup")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import Image from "next/image";
import { logout } from "@/lib/auth/logout";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { Bell } from "lucide-react";

type Props = {
  authenticated?: boolean;
  isAdmin?: boolean;
  unreadChats?: number;
  pendingBookings?: number;
  unreadNotifications?: number;
};

/** Numeric badge — used only for notifications */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Simple dot — used for messages and bookings: just shows there's something, without a number */
function Dot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
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
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo — icon only on mobile, icon + text on sm+ */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/icon-purple.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-auto dark:hidden"
            priority
          />
          <Image
            src="/icon-white.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-auto hidden dark:block"
            priority
          />
          <Image
            src="/text-purple.png"
            alt="Unseeny"
            width={90}
            height={24}
            className="h-6 w-auto dark:hidden hidden sm:block"
            priority
          />
          <Image
            src="/text-white.png"
            alt="Unseeny"
            width={90}
            height={24}
            className="h-6 w-auto hidden dark:sm:block"
            priority
          />
        </Link>

        <nav className="flex items-center gap-5">
          {authenticated ? (
            <>
              <Link href="/listings" className="text-muted-foreground hover:text-foreground transition">
                {t("browse")}
              </Link>

              <Link href="/bookings" className="relative text-muted-foreground hover:text-foreground transition">
                {t("bookings")}
                <Dot show={pendingBookings > 0} />
              </Link>

              <Link href="/chats" className="relative text-muted-foreground hover:text-foreground transition">
                {t("chats")}
                <Dot show={unreadChats > 0} />
              </Link>

              <Link href="/profile" className="text-muted-foreground hover:text-foreground transition">
                {t("profile")}
              </Link>

              {isAdmin && (
                <Link href="/admin" className="text-muted-foreground hover:text-foreground font-medium transition">
                  {t("admin")}
                </Link>
              )}

              <LanguageSwitcher currentLocale={locale} />

              <Link href="/notifications" className="relative text-muted-foreground hover:text-foreground transition">
                <Bell className="h-5 w-5" />
                <Badge count={unreadNotifications} />
              </Link>

              <ThemeToggle />

              <form action={logout}>
                <button className="bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition">
                  {t("logout")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition">
                {t("login")}
              </Link>
              <ThemeToggle />
              <LanguageSwitcher currentLocale={locale} />
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

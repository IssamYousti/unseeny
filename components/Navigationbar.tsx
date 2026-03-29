import Link from "next/link";
import { logout } from "@/lib/auth/logout";

type Props = {
  authenticated?: boolean;
  isAdmin?: boolean;
};

export default function Navbar({ authenticated = false, isAdmin = false }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Hidden<span className="text-primary">Villas</span>
        </Link>

        <nav className="flex items-center gap-5">
          {authenticated ? (
            <>
              <Link
                href="/listings"
                className="text-muted-foreground hover:text-foreground transition"
              >
                Browse
              </Link>

              <Link 
              href="/chats"
              className="text-muted-foreground hover:text-foreground transition"
              >
                Chats
              </Link>


              <Link
                href="/profile"
                className="text-muted-foreground hover:text-foreground transition"
              >
                Profile
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-muted-foreground hover:text-foreground font-medium transition"
                >
                  Admin
                </Link>
              )}

              <form action={logout}>
                <button className="bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-muted-foreground hover:text-foreground transition"
              >
                Login
              </Link>

              <Link
                href="/auth/sign-up"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

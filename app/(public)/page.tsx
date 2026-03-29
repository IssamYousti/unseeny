import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">

      {/* LOGO */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Hidden<span className="text-primary">Villas</span>
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Private villas for peaceful stays
        </p>
      </div>

      {/* HERO MESSAGE */}
      <div className="text-center max-w-2xl space-y-6">
        <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">
          Travel without compromise on privacy.
        </h2>

        <p className="text-muted-foreground">
          Discover homes designed for comfort, modesty and relaxation.
          Every stay gives you a space where you can truly unwind.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-md">

        <Link
          href="/listings"
          className="flex-1 text-center bg-primary text-primary-foreground px-6 py-4 rounded-xl font-medium hover:opacity-90 transition"
        >
          Browse villas
        </Link>

        <Link
          href="/auth/sign-up"
          className="flex-1 text-center border border-border px-6 py-4 rounded-xl font-medium hover:bg-muted transition"
        >
          Become a host
        </Link>

      </div>

      {/* LOGIN */}
      <p className="text-sm text-muted-foreground mt-8">
        Already have an account?{" "}
        <Link href="/auth/login" className="underline hover:text-foreground">
          Log in
        </Link>
      </p>

    </main>
  );
}

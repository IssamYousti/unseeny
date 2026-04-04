import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navigationbar";
import Footer from "@/components/Footer";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/listings");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar authenticated={false} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

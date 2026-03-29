import Navbar from "@/components/Navigationbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // fetch role
  const { data: role } = await supabase
    .from("roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  const isAdmin = role?.is_admin ?? false;

  return (
    <main className="min-h-screen bg-background">
      <Navbar authenticated isAdmin={isAdmin} />
      {children}
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in → go to app
  if (user) {
    redirect("/listings");
  }

  return <>{children}</>;
}

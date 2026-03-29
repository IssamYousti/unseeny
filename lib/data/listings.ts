import { createClient } from "@/lib/supabase/server";
import { unstable_noStore } from "next/cache";

export async function getApprovedListings() {
  unstable_noStore(); // 👈 tells Next this depends on request/session

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select()
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
}

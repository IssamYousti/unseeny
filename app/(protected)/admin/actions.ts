"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveListing(listingId: string) {
  const supabase = await createClient();

  // 1️⃣ Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // 2️⃣ Admin check
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (roleError || !role || !role.is_admin) {
    throw new Error("Not authorized");
  }

  // 3️⃣ Approve listing
  const { error } = await supabase
    .from("listings")
    .update({
      is_approved: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  // 4️⃣ Revalidate pages
  revalidatePath("/protected/admin");
  revalidatePath("/protected/listings");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { error: "Not authenticated" };

  const username = formData.get("username") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const dob = formData.get("dob") as string | null;

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      first_name,
      last_name,
      dob: dob || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

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
  const host_bio = (formData.get("host_bio") as string | null)?.trim() || null;
  const hosting_since = (formData.get("hosting_since") as string | null) || null;

  // Parse languages: comma-separated string → trimmed array
  const languagesRaw = (formData.get("languages") as string | null) ?? "";
  const languages = languagesRaw
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const is_business = formData.get("is_business") === "true";
  const vat_number = (formData.get("vat_number") as string | null)?.trim().toUpperCase() || null;
  const billing_country = (formData.get("billing_country") as string | null)?.trim().toUpperCase().slice(0, 2) || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      first_name,
      last_name,
      dob: dob || null,
      host_bio,
      hosting_since: hosting_since || null,
      languages,
      is_business,
      // Reset vat_validated when the number changes — requires re-verification
      vat_number: is_business ? vat_number : null,
      vat_validated: false,
      billing_country: is_business ? billing_country : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

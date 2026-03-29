"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribeToNotifications(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string; already?: boolean }> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("listing_notifications")
    .insert({ email });

  if (error) {
    if (error.code === "23505") return { already: true }; // unique violation
    return { error: error.message };
  }

  return { success: true };
}

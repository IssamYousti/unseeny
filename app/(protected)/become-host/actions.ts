"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function applyForHost(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("host_applications").upsert({
    user_id: user.id,
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    property_description: formData.get("property_description"),
    privacy_guarantee: formData.get("privacy_guarantee"),
  });

  if (error) throw new Error(error.message);

  redirect("/profile?applied=true");
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Visiting /listings/manage immediately creates a blank draft listing
 * and redirects to the full edit page — no separate "create" form needed.
 */
export default async function CreateListingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: role } = await supabase
    .from("roles")
    .select("is_approved_host")
    .eq("user_id", user.id)
    .single();

  if (!role?.is_approved_host) redirect("/profile");

  const { data: draft, error } = await supabase
    .from("listings")
    .insert({
      host_id: user.id,
      title: "New listing",
      street: "",
      house_number: "",
      zip_code: "",
      city: "",
      country: "",
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      price_per_night: 0,
    })
    .select("id")
    .single();

  if (error || !draft) redirect("/profile");

  redirect(`/listings/manage/${draft.id}?created=1`);
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleFavourite(
  listingId: string,
): Promise<{ isFavourite: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("listing_favourites")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    await supabase.from("listing_favourites").delete().eq("id", existing.id);
    revalidatePath("/favourites");
    return { isFavourite: false };
  } else {
    await supabase
      .from("listing_favourites")
      .insert({ user_id: user.id, listing_id: listingId });
    revalidatePath("/favourites");
    return { isFavourite: true };
  }
}

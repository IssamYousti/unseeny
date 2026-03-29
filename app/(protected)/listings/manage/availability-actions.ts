"use server";

import { createClient } from "@/lib/supabase/server";

export async function addBlockedPeriod(
  listingId: string,
  startDate: string,
  endDate: string,
): Promise<{ period?: { id: string; start_date: string; end_date: string }; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify host owns the listing
  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!listing || listing.host_id !== user.id) return { error: "Not allowed" };

  if (endDate < startDate) return { error: "End date must be on or after start date" };

  const { data, error } = await supabase
    .from("blocked_periods")
    .insert({ listing_id: listingId, host_id: user.id, start_date: startDate, end_date: endDate })
    .select("id, start_date, end_date")
    .single();

  if (error) return { error: "Could not save blocked period." };
  return { period: data };
}

export async function removeBlockedPeriod(
  id: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("blocked_periods")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) return { error: "Could not remove blocked period." };
  return {};
}

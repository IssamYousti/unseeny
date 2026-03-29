"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requestBooking(listingId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // get listing host
  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!listing) throw new Error("Listing not found");

  // 1️⃣ find existing conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("guest_id", user.id)
    .single();

  // 2️⃣ create if missing
  if (!conversation) {
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        guest_id: user.id,
        host_id: listing.host_id,
      })
      .select("id")
      .single();

    if (error) throw error;
    conversation = newConv;

    // optional first message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: "Hello, I would like to request this booking.",
    });
  }

  redirect(`/chat/${conversation.id}`);
}

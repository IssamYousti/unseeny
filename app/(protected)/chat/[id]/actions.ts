"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content,
  });
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { moderateMessage, getModerationMessage } from "@/lib/moderation";

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty." };

  // Server-side moderation (authoritative — client check is UX only)
  const result = moderateMessage(trimmed);
  if (result.blocked) {
    return { error: getModerationMessage(result.reason) };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { error: "Failed to send message. Please try again." };

  return {};
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("conversation_reads").upsert(
    { user_id: user.id, conversation_id: conversationId, last_read_at: new Date().toISOString() },
    { onConflict: "user_id,conversation_id" },
  );
}

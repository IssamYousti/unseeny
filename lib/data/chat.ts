import { createClient } from "@/lib/supabase/server";
import { unstable_noStore } from "next/cache";

export async function getConversation(conversationId: string) {
  unstable_noStore();

  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, listings(title)")
    .eq("id", conversationId)
    .single();

  if (!conversation) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return { conversation, messages: messages ?? [] };
}

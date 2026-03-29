"use server";

import { createClient } from "@/lib/supabase/server";

export async function archiveConversation(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: conv, error } = await supabase
    .from("conversations")
    .select("guest_id, host_id")
    .eq("id", id)
    .single();

  if (error || !conv) throw new Error("Conversation not found");

  const column =
    conv.guest_id === user.id ? "guest_archived" : "host_archived";

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ [column]: true })
    .eq("id", id);

  if (updateError) throw new Error(updateError.message);
}

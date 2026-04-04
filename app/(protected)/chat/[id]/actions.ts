"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateMessage, checkBlacklist, getModerationMessage } from "@/lib/moderation";

// ─────────────────────────────────────────────────────────────────────────────

async function logViolationAndNotifyAdmins(opts: {
  content: string;
  conversationId: string;
  senderId: string;
  reason: string;
  matchedValue?: string;
}) {
  const admin = createAdminClient();

  // Log violation (non-fatal)
  await admin.from("chat_violations").insert({
    message_content: opts.content,
    conversation_id: opts.conversationId,
    sender_id: opts.senderId,
    matched_rule: opts.reason,
    matched_value: opts.matchedValue ?? null,
  });

  // Notify all admins
  const { data: admins } = await admin
    .from("roles")
    .select("user_id")
    .eq("is_admin", true);

  if (admins && admins.length > 0) {
    await admin.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.user_id,
        type: "chat_violation",
        title: "Chat violation intercepted",
        body: `A blocked message was detected (rule: ${opts.reason}). Review it in the Moderation tab.`,
        link: "/admin?tab=moderation",
      })),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty." };

  // ── 1. Static pattern check (email, phone, URLs, handles, etc.) ──────────
  const staticResult = moderateMessage(trimmed);
  if (staticResult.blocked) {
    // Fire-and-forget — don't await so it doesn't slow down the response
    logViolationAndNotifyAdmins({
      content: trimmed,
      conversationId,
      senderId: user.id,
      reason: staticResult.reason,
      matchedValue: staticResult.matchedValue,
    }).catch(() => {});

    return { error: getModerationMessage(staticResult.reason) };
  }

  // ── 2. Dynamic DB blacklist check ────────────────────────────────────────
  const admin = createAdminClient();
  const { data: blacklist } = await admin
    .from("chat_blacklist")
    .select("type, value")
    .eq("is_active", true);

  if (blacklist && blacklist.length > 0) {
    const dynamicResult = checkBlacklist(trimmed, blacklist);
    if (dynamicResult.blocked) {
      logViolationAndNotifyAdmins({
        content: trimmed,
        conversationId,
        senderId: user.id,
        reason: dynamicResult.reason,
        matchedValue: dynamicResult.matchedValue,
      }).catch(() => {});

      return { error: getModerationMessage(dynamicResult.reason) };
    }
  }

  // ── 3. Send message ───────────────────────────────────────────────────────
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

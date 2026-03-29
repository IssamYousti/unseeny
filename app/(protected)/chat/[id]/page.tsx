import { Suspense } from "react";
import { getConversation } from "@/lib/data/chat";
import ChatClient from "./ChatClient";
import { createClient } from "@/lib/supabase/server";

async function ChatLoader(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div className="p-10">Not authenticated</div>;

  const data = await getConversation(id);
  if (!data) return <div className="p-10">Conversation not found</div>;

  const { conversation } = data;
  const otherId = conversation.guest_id === user.id ? conversation.host_id : conversation.guest_id;

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", otherId)
    .maybeSingle();

  const otherName = otherProfile
    ? [otherProfile.first_name, otherProfile.last_name].filter(Boolean).join(" ")
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listingTitle = (conversation.listings as any)?.title ?? null;

  return (
    <ChatClient
      conversation={conversation}
      initialMessages={data.messages}
      currentUserId={user.id}
      otherPartyName={otherName ?? otherId.slice(0, 8)}
      listingTitle={listingTitle}
    />
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    }>
      <ChatLoader params={props.params} />
    </Suspense>
  );
}

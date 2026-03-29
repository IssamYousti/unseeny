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

  return (
    <ChatClient
      conversation={data.conversation}
      initialMessages={data.messages}
      currentUserId={user.id}
    />
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10">Loading chat...</div>}>
      <ChatLoader params={props.params} />
    </Suspense>
  );
}

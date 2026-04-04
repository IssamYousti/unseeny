import { Suspense } from "react";
import { getConversation } from "@/lib/data/chat";
import ChatClient from "./ChatClient";
import { createClient } from "@/lib/supabase/server";

async function ChatLoader(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-10">Not authenticated</div>;

  const data = await getConversation(id);
  if (!data) return <div className="p-10">Conversation not found</div>;

  const { conversation } = data;
  const isHost = conversation.host_id === user.id;
  const otherId = isHost ? conversation.guest_id : conversation.host_id;

  const [{ data: otherProfile }, { data: booking }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", otherId)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id, status, check_in, check_out, guests_count, total_price, created_at")
      .eq("conversation_id", id)
      .maybeSingle(),
  ]);

  const otherName = otherProfile
    ? [otherProfile.first_name, otherProfile.last_name].filter(Boolean).join(" ")
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listingTitle = (conversation.listings as any)?.title ?? null;
  const otherRole: "host" | "guest" = isHost ? "guest" : "host";
  const profileHref = otherRole === "host" ? `/hosts/${otherId}` : `/guests/${otherId}`;

  return (
    <ChatClient
      conversation={conversation}
      initialMessages={data.messages}
      currentUserId={user.id}
      otherPartyName={otherName ?? otherId.slice(0, 8)}
      otherPartyId={otherId}
      otherPartyRole={otherRole}
      profileHref={profileHref}
      listingTitle={listingTitle}
      listingId={conversation.listing_id ?? null}
      booking={booking ?? null}
    />
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <ChatLoader params={props.params} />
    </Suspense>
  );
}

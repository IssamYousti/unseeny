import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ChatsPage() {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user!;

  const { data } = await supabase
    .from("conversations")
    .select("id, listing_id, guest_id, host_id, created_at")
    .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-4">
      <h1 className="text-3xl font-semibold">Your conversations</h1>

      {data?.map((c) => (
        <Link
          key={c.id}
          href={`/chat/${c.id}`}
          className="block bg-card border border-border rounded-xl p-4 hover:bg-muted transition"
        >
          Conversation {c.id.slice(0, 6)}
        </Link>
      ))}
    </div>
  );
}

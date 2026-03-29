"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "./actions";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ChatClient({
  conversation,
  initialMessages,
  currentUserId,
}: {
  conversation: any;
  initialMessages: Message[];
  currentUserId: string;
}) {
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // realtime subscription
  useEffect(() => {
  const channel = supabase
    .channel("chat-" + conversation.id)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      },
      (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel); // no await
  };
}, [conversation.id]);


  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    const optimisticMessage: Message = {
      id: "temp-" + Date.now(),
      sender_id: currentUserId,
      content: text,
      created_at: new Date().toISOString(),
    };

    // instant UI update
    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    startTransition(async () => {
      await sendMessage(conversation.id, optimisticMessage.content);
    });
  }

  return (
    <div className="max-w-3xl mx-auto py-10 flex flex-col h-[80vh]">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 border border-border rounded-2xl p-5 bg-card">

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-4 py-2 rounded-2xl max-w-[70%] text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-3 mt-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 input"
        />
        <button
          disabled={isPending}
          className="bg-primary text-primary-foreground px-5 rounded-xl"
        >
          Send
        </button>
      </form>
    </div>
  );
}

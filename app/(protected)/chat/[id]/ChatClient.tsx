"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, markConversationRead } from "./actions";
import { moderateMessage, getModerationMessage } from "@/lib/moderation";
import {
  AlertCircle,
  ArrowLeft,
  Send,
  ExternalLink,
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  Home,
} from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Booking = {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  created_at: string;
} | null;

type MessageGroup = {
  senderId: string;
  isMe: boolean;
  messages: Message[];
};

function buildGroups(messages: Message[], currentUserId: string): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const isMe = msg.sender_id === currentUserId;
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.sender_id) {
      last.messages.push(msg);
    } else {
      groups.push({ senderId: msg.sender_id, isMe, messages: [msg] });
    }
  }
  return groups;
}

function toDateKey(iso: string) {
  return new Date(iso).toDateString();
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const BOOKING_STATUS: Record<
  string,
  { label: string; cls: string; Icon: React.ElementType }
> = {
  pending:   { label: "Pending",   cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",   Icon: Clock },
  confirmed: { label: "Confirmed", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", Icon: CheckCircle2 },
  rejected:  { label: "Declined",  cls: "bg-rose-500/10 text-rose-600 border-rose-500/20",      Icon: XCircle },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border",          Icon: MinusCircle },
};

export default function ChatClient({
  conversation,
  initialMessages,
  currentUserId,
  otherPartyName,
  otherPartyId,
  otherPartyRole,
  profileHref,
  listingTitle,
  listingId,
  booking,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversation: any;
  initialMessages: Message[];
  currentUserId: string;
  otherPartyName: string;
  otherPartyId: string;
  otherPartyRole: "host" | "guest";
  profileHref: string;
  listingTitle: string | null;
  listingId: string | null;
  booking: Booking;
}) {
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    markConversationRead(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

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
          setMessages((prev) => {
            const incoming = payload.new as Message;
            if (prev.some((m) => m.id === incoming.id)) return prev;
            const tempIdx = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") && m.sender_id === incoming.sender_id,
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = incoming;
              return next;
            }
            if (incoming.sender_id !== currentUserId) {
              markConversationRead(conversation.id);
            }
            return [...prev, incoming];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const check = moderateMessage(trimmed);
    if (check.blocked) {
      setErrorMsg(getModerationMessage(check.reason));
      return;
    }

    setErrorMsg(null);
    const tempId = "temp-" + Date.now();
    const optimistic: Message = {
      id: tempId,
      sender_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");

    startTransition(async () => {
      const result = await sendMessage(conversation.id, trimmed);
      if (result.error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(trimmed);
        setErrorMsg(result.error);
        inputRef.current?.focus();
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  const groups = buildGroups(messages, currentUserId);
  const initial = otherPartyName.charAt(0).toUpperCase();

  type Entry =
    | { type: "separator"; label: string }
    | { type: "group"; group: MessageGroup };

  const entries: Entry[] = [];
  let lastDate = "";
  for (const group of groups) {
    const firstDate = toDateKey(group.messages[0].created_at);
    if (firstDate !== lastDate) {
      entries.push({
        type: "separator",
        label: formatDateLabel(group.messages[0].created_at),
      });
      lastDate = firstDate;
    }
    entries.push({ type: "group", group });
  }

  const bookingStatus = booking ? (BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border">
        {/* Top bar: back + name + profile link */}
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/chats"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0 select-none">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold leading-tight">{otherPartyName}</p>
              <Link
                href={profileHref}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                View {otherPartyRole} profile
              </Link>
            </div>
            {listingTitle && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Home className="h-3 w-3 text-muted-foreground shrink-0" />
                {listingId ? (
                  <Link
                    href={`/listings/${listingId}`}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate"
                  >
                    {listingTitle}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground truncate">{listingTitle}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Booking context bar */}
        {booking && bookingStatus && (
          <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${bookingStatus.cls}`}
            >
              <bookingStatus.Icon className="h-3 w-3" />
              {bookingStatus.label}
            </span>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {formatShortDate(booking.check_in)} → {formatShortDate(booking.check_out)}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3 shrink-0" />
              {booking.guests_count} {booking.guests_count === 1 ? "guest" : "guests"}
            </div>

            <span className="text-xs font-semibold text-foreground ml-auto">
              €{Number(booking.total_price).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary select-none">
              {initial}
            </div>
            <div>
              <p className="text-sm font-semibold">{otherPartyName}</p>
              {listingTitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{listingTitle}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Send a message to start the conversation.
            </p>
          </div>
        ) : (
          entries.map((entry, i) => {
            if (entry.type === "separator") {
              return (
                <div key={`sep-${i}`} className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                    {entry.label}
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
              );
            }

            const { group } = entry;
            return (
              <div
                key={`group-${i}`}
                className={`flex flex-col gap-0.5 mb-3 ${group.isMe ? "items-end" : "items-start"}`}
              >
                {!group.isMe && (
                  <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground select-none mb-1 ml-1">
                    {initial}
                  </div>
                )}

                {group.messages.map((msg, msgIdx) => {
                  const isFirst = msgIdx === 0;
                  const isLast = msgIdx === group.messages.length - 1;
                  const isTemp = msg.id.startsWith("temp-");

                  let rounding = "";
                  if (group.isMe) {
                    if (group.messages.length === 1) rounding = "rounded-2xl rounded-br-md";
                    else if (isFirst) rounding = "rounded-2xl rounded-br-md";
                    else if (isLast) rounding = "rounded-2xl rounded-tr-md";
                    else rounding = "rounded-2xl rounded-r-md";
                  } else {
                    if (group.messages.length === 1) rounding = "rounded-2xl rounded-bl-md";
                    else if (isFirst) rounding = "rounded-2xl rounded-bl-md";
                    else if (isLast) rounding = "rounded-2xl rounded-tl-md";
                    else rounding = "rounded-2xl rounded-l-md";
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`px-3.5 py-2 max-w-[72%] text-sm whitespace-pre-line break-words leading-relaxed ${rounding} ${
                        group.isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      } ${isTemp ? "opacity-60" : ""}`}
                    >
                      {msg.content}
                    </div>
                  );
                })}

                <span className="text-[11px] text-muted-foreground/50 mt-0.5 px-1">
                  {formatTime(group.messages[group.messages.length - 1].created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="shrink-0 mx-4 mb-2 flex items-start gap-2 bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-2.5">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            type="button"
            className="shrink-0 opacity-60 hover:opacity-100 transition text-base leading-none"
            onClick={() => setErrorMsg(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              if (errorMsg) setErrorMsg(null);
              e.target.style.height = "auto";
              e.target.style.height =
                Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={isPending}
            className="flex-1 resize-none bg-muted/60 border border-border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 leading-relaxed min-h-[42px] max-h-[120px] overflow-y-auto"
          />
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="h-[42px] w-[42px] shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[11px] text-muted-foreground/40 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

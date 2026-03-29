-- conversation_reads: tracks when each user last read a conversation.
-- Used to compute unread message badges in the navbar.

create table if not exists public.conversation_reads (
  user_id uuid not null references auth.users on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

alter table public.conversation_reads enable row level security;

-- Users can only read and write their own entries
drop policy if exists "User can manage own reads" on public.conversation_reads;
create policy "User can manage own reads"
on public.conversation_reads
using (user_id = auth.uid())
with check (user_id = auth.uid());

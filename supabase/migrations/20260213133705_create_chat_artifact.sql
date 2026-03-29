create table public.conversations (
  id uuid default gen_random_uuid() primary key,

  listing_id uuid references listings(id) on delete cascade,
  guest_id uuid references auth.users not null,
  host_id uuid references auth.users not null,

  created_at timestamptz default now(),

  unique(listing_id, guest_id)
);

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references auth.users not null,
  content text not null,
  created_at timestamptz default now()
);


alter table conversations enable row level security;

create policy "Participants can read conversation"
on conversations
for select
using (auth.uid() = guest_id OR auth.uid() = host_id);

create policy "Guest can create conversation"
on conversations
for insert
with check (auth.uid() = guest_id);

alter table messages enable row level security;

create policy "Participants read messages"
on messages
for select
using (
  exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.guest_id = auth.uid() or c.host_id = auth.uid())
  )
);

create policy "Participants send messages"
on messages
for insert
with check (
  exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.guest_id = auth.uid() or c.host_id = auth.uid())
  )
);

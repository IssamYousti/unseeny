alter table conversations
add column guest_archived boolean default false,
add column host_archived boolean default false;

create policy "Participants can update conversation"
on conversations
for update
using (auth.uid() = guest_id OR auth.uid() = host_id)
with check (auth.uid() = guest_id OR auth.uid() = host_id);

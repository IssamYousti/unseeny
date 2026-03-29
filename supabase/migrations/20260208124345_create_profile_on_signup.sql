--------------------------------------------------
-- FUNCTION: runs when a new user is created
--------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

--------------------------------------------------
-- TRIGGER: fires after auth.users INSERT
--------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

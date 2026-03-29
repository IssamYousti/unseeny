--------------------------------------------------
-- FUNCTION: runs when a new user is created
--------------------------------------------------
create or replace function public.handle_new_user_roles()
returns trigger as $$
begin
  insert into public.roles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

--------------------------------------------------
-- TRIGGER: fires after auth.users INSERT
--------------------------------------------------
create trigger on_auth_user_created_roles
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_roles();

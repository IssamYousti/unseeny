--------------------------------------------------
-- ADMIN METRICS HELPERS
--------------------------------------------------

create or replace function public.count_total_users()
returns bigint as $$
  select count(*) from auth.users;
$$ language sql security definer;

create or replace function public.count_active_users_7d()
returns bigint as $$
  select count(*)
  from auth.users
  where last_sign_in_at >= now() - interval '7 days';
$$ language sql security definer;

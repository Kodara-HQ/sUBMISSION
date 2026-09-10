-- Create the first super administrator after the Auth user exists.
-- 1. Authentication > Users > Add user (email/password)
-- 2. Replace the email below and run this in the SQL Editor.

insert into public.admin_users (user_id, email, full_name, role, is_active)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrator'),
  'super_admin',
  true
from auth.users
where lower(email) = lower('admin@your-organization.com')
on conflict (email) do update
  set user_id = excluded.user_id,
      is_active = true,
      role = 'super_admin',
      updated_at = now();

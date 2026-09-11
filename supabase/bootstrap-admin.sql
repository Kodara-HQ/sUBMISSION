-- Link or create the first super administrator after the Auth user exists.
-- 1. Authentication > Users > Add user (or sign in once via the app bootstrap):
--    Email: lamadekue@gmail.com
--    Password: (the password you chose)
--    Auto Confirm: enabled (or turn off Confirm email in Auth providers)
-- 2. Run this in the SQL Editor.

insert into public.admin_users (user_id, email, full_name, role, is_active)
select
  id,
  email,
  'Emmanuel Lamadeku',
  'super_admin',
  true
from auth.users
where lower(email) = lower('lamadekue@gmail.com')
on conflict (email) do update
  set user_id = excluded.user_id,
      full_name = excluded.full_name,
      is_active = true,
      role = 'super_admin',
      updated_at = now();

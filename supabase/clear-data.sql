-- Wipe transactional portal data. Keeps departments, submission types, questions, and settings.
-- Run in Supabase SQL Editor after schema.sql / seed.sql.

truncate table public.notification_queue restart identity cascade;
truncate table public.admin_notes restart identity cascade;
truncate table public.submission_files restart identity cascade;
truncate table public.submission_answers restart identity cascade;
truncate table public.submissions restart identity cascade;
truncate table public.employees restart identity cascade;

-- Reset administrators, then re-link the primary admin from Auth.
truncate table public.admin_users restart identity cascade;

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

update public.app_settings
set organization_name = 'Bloj Company LTD',
    notification_email = 'lamadekue@gmail.com',
    updated_at = now()
where id = 1;

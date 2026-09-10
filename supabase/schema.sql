-- Employee Submission Portal
-- Run this script in the Supabase SQL Editor (or via the CLI) before using the app.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_name_len check (char_length(trim(name)) between 1 and 80)
);

create table if not exists public.submission_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_types_name_len check (char_length(trim(name)) between 1 and 80)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  employee_id text,
  email text,
  department_id uuid references public.departments (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_name_len check (char_length(trim(full_name)) between 2 and 120),
  constraint employees_has_identifier check (
    nullif(trim(coalesce(employee_id, '')), '') is not null
    or nullif(trim(coalesce(email, '')), '') is not null
  )
);

create unique index if not exists employees_employee_id_unique
  on public.employees (lower(employee_id))
  where employee_id is not null and trim(employee_id) <> '';

create unique index if not exists employees_email_unique
  on public.employees (lower(email))
  where email is not null and trim(email) <> '';

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  help_text text,
  placeholder text,
  field_type text not null check (field_type in (
    'short_text', 'long_text', 'multiple_choice', 'checkboxes',
    'dropdown', 'date', 'number', 'file'
  )),
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_label_len check (char_length(trim(label)) between 1 and 240)
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  organization_name text not null default 'Employee Spotlight',
  allowed_file_types text[] not null default array['pdf','doc','docx','xls','xlsx','jpg','jpeg','png'],
  max_file_size_mb integer not null default 10 check (max_file_size_mb between 1 and 50),
  require_known_employee boolean not null default false,
  prevent_duplicate_same_day boolean not null default true,
  notification_email text,
  notification_webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees (id) on delete set null,
  employee_full_name text not null,
  employee_identifier text not null,
  department_id uuid references public.departments (id) on delete set null,
  department_name text not null,
  submission_type_id uuid references public.submission_types (id) on delete set null,
  submission_type_name text not null,
  submission_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  question_label text not null,
  field_type text not null,
  answer_text text,
  answer_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_size bigint not null check (file_size > 0),
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  admin_user_id uuid references public.admin_users (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_notes_len check (char_length(trim(note)) between 1 and 4000)
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_employees_department on public.employees (department_id);
create index if not exists idx_employees_active on public.employees (is_active);
create index if not exists idx_questions_sort on public.questions (sort_order);
create index if not exists idx_questions_active on public.questions (is_active, sort_order);
create index if not exists idx_question_options_question on public.question_options (question_id, sort_order);
create index if not exists idx_submissions_status on public.submissions (status);
create index if not exists idx_submissions_department on public.submissions (department_id);
create index if not exists idx_submissions_type on public.submissions (submission_type_id);
create index if not exists idx_submissions_created on public.submissions (created_at desc);
create index if not exists idx_submissions_date on public.submissions (submission_date);
create index if not exists idx_submissions_identifier on public.submissions (lower(employee_identifier));
create index if not exists idx_submissions_name on public.submissions (lower(employee_full_name));
create index if not exists idx_submissions_employee on public.submissions (employee_id);
create index if not exists idx_answers_submission on public.submission_answers (submission_id);
create index if not exists idx_files_submission on public.submission_files (submission_id);
create index if not exists idx_notes_submission on public.admin_notes (submission_id);
create index if not exists idx_notification_queue_status on public.notification_queue (status, created_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_submission_types_updated_at on public.submission_types;
create trigger trg_submission_types_updated_at before update on public.submission_types
  for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at before update on public.admin_users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_question_options_updated_at on public.question_options;
create trigger trg_question_options_updated_at before update on public.question_options
  for each row execute function public.set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_submissions_updated_at on public.submissions;
create trigger trg_submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_submission_answers_updated_at on public.submission_answers;
create trigger trg_submission_answers_updated_at before update on public.submission_answers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_notes_updated_at on public.admin_notes;
create trigger trg_admin_notes_updated_at before update on public.admin_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
      and role = 'super_admin'
  );
$$;

-- Link invited admin emails when an Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.admin_users
  set user_id = new.id,
      updated_at = now()
  where lower(email) = lower(new.email)
    and user_id is null
    and is_active = true;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- First administrator only (no admins exist yet). Prefer the app bootstrap
-- flow with ADMIN_BOOTSTRAP_EMAIL, or insert a row manually (see README).
create or replace function public.bootstrap_admin()
returns public.admin_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_users;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.admin_users) then
    raise exception 'An administrator already exists.';
  end if;

  insert into public.admin_users (user_id, email, full_name, role, is_active)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    coalesce(auth.jwt() ->> 'email', 'Administrator'),
    'super_admin',
    true
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Duplicate prevention + notification queue
-- ---------------------------------------------------------------------------

create or replace function public.prevent_duplicate_submission()
returns trigger
language plpgsql
as $$
declare
  prevent boolean;
begin
  select prevent_duplicate_same_day into prevent from public.app_settings where id = 1;
  if coalesce(prevent, true) then
    if exists (
      select 1
      from public.submissions s
      where lower(s.employee_full_name) = lower(new.employee_full_name)
        and s.submission_type_id is not distinct from new.submission_type_id
        and s.submission_date = new.submission_date
        and s.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
      raise exception 'A submission of this type has already been received for this employee on this date.'
        using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_duplicate_submission on public.submissions;
create trigger trg_prevent_duplicate_submission
  before insert on public.submissions
  for each row execute function public.prevent_duplicate_submission();

create or replace function public.enqueue_submission_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_queue (event_type, payload)
  values (
    'submission.created',
    jsonb_build_object(
      'submission_id', new.id,
      'employee_full_name', new.employee_full_name,
      'employee_identifier', new.employee_identifier,
      'department_name', new.department_name,
      'submission_type_name', new.submission_type_name,
      'created_at', new.created_at
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_enqueue_submission_notification on public.submissions;
create trigger trg_enqueue_submission_notification
  after insert on public.submissions
  for each row execute function public.enqueue_submission_notification();

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_public_settings()
returns table (
  organization_name text,
  allowed_file_types text[],
  max_file_size_mb integer,
  require_known_employee boolean,
  prevent_duplicate_same_day boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.organization_name,
    s.allowed_file_types,
    s.max_file_size_mb,
    s.require_known_employee,
    s.prevent_duplicate_same_day
  from public.app_settings s
  where s.id = 1;
$$;

create or replace function public.lookup_employee(identifier text)
returns table (
  id uuid,
  full_name text,
  email text,
  employee_id text,
  department_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  v_id := nullif(trim(identifier), '');
  if v_id is null then
    return;
  end if;

  return query
  select e.id, e.full_name, e.email, e.employee_id, e.department_id
  from public.employees e
  where e.is_active = true
    and (
      lower(e.email) = lower(v_id)
      or lower(e.employee_id) = lower(v_id)
    )
  limit 1;
end;
$$;

create or replace function public.submit_form(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
  v_identifier text;
  v_dept uuid;
  v_type uuid;
  v_date date;
  v_emp public.employees%rowtype;
  v_dept_row public.departments%rowtype;
  v_type_row public.submission_types%rowtype;
  v_settings public.app_settings%rowtype;
  v_q public.questions%rowtype;
  v_ans jsonb;
  v_text text;
  v_json jsonb;
begin
  select * into v_settings from public.app_settings where id = 1;

  v_name := nullif(trim(payload->>'employee_full_name'), '');
  v_identifier := nullif(trim(payload->>'employee_identifier'), '');
  begin
    v_dept := nullif(payload->>'department_id', '')::uuid;
    v_type := nullif(payload->>'submission_type_id', '')::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Please select a valid department and submission type.';
  end;
  begin
    v_date := coalesce(nullif(payload->>'submission_date', '')::date, current_date);
  exception
    when others then
      raise exception 'Please enter a valid submission date.';
  end;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Please enter a valid full name.';
  end if;
  if v_identifier is null or char_length(v_identifier) < 2 or char_length(v_identifier) > 120 then
    raise exception 'Please enter a valid job title.';
  end if;

  select * into v_dept_row from public.departments where id = v_dept and is_active = true;
  if v_dept_row.id is null then
    raise exception 'Please select a valid department.';
  end if;

  select * into v_type_row from public.submission_types where id = v_type and is_active = true;
  if v_type_row.id is null then
    raise exception 'Please select a valid submission type.';
  end if;

  if v_date > current_date + 1 then
    raise exception 'Please enter a valid submission date.';
  end if;

  insert into public.submissions (
    employee_id,
    employee_full_name,
    employee_identifier,
    department_id,
    department_name,
    submission_type_id,
    submission_type_name,
    submission_date,
    status
  ) values (
    v_emp.id,
    v_name,
    v_identifier,
    v_dept_row.id,
    v_dept_row.name,
    v_type_row.id,
    v_type_row.name,
    v_date,
    'pending'
  )
  returning id into v_id;

  for v_q in
    select * from public.questions where is_active = true order by sort_order, created_at
  loop
    select elem
      into v_ans
    from jsonb_array_elements(coalesce(payload->'answers', '[]'::jsonb)) elem
    where (elem->>'question_id') = v_q.id::text
    limit 1;

    v_text := nullif(trim(coalesce(v_ans->>'answer_text', '')), '');
    if v_ans ? 'answer_json' and jsonb_typeof(v_ans->'answer_json') <> 'null' then
      v_json := v_ans->'answer_json';
    else
      v_json := null;
    end if;

    if v_q.is_required and v_q.field_type <> 'file' then
      if v_q.field_type = 'checkboxes' then
        if v_json is null or jsonb_typeof(v_json) <> 'array' or jsonb_array_length(v_json) = 0 then
          raise exception 'Please complete all required questions.';
        end if;
      elsif v_text is null then
        raise exception 'Please complete all required questions.';
      end if;
    end if;

    if v_text is not null or (v_json is not null and jsonb_typeof(v_json) = 'array' and jsonb_array_length(v_json) > 0) then
      insert into public.submission_answers (
        submission_id, question_id, question_label, field_type, answer_text, answer_json
      ) values (
        v_id, v_q.id, v_q.label, v_q.field_type, v_text, v_json
      );
    elsif v_q.field_type = 'file' then
      insert into public.submission_answers (
        submission_id, question_id, question_label, field_type, answer_text, answer_json
      ) values (
        v_id, v_q.id, v_q.label, v_q.field_type, null, null
      );
    end if;
  end loop;

  return v_id;
exception
  when unique_violation then
    raise exception 'A submission of this type has already been received for this employee on this date.';
  when others then
    if sqlerrm like 'Please %'
       or sqlerrm like 'A submission%'
       or sqlerrm like 'Employee %' then
      raise;
    end if;
    raise exception 'Unable to submit the form. Please review your answers and try again.';
end;
$$;

create or replace function public.attach_submission_files(
  p_submission_id uuid,
  p_files jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions%rowtype;
  v_settings public.app_settings%rowtype;
  v_file jsonb;
  v_name text;
  v_path text;
  v_size bigint;
  v_mime text;
  v_question uuid;
  v_ext text;
  v_allowed boolean;
begin
  select * into v_sub from public.submissions where id = p_submission_id;
  if v_sub.id is null then
    raise exception 'Unable to attach files to this submission.';
  end if;
  if v_sub.created_at < now() - interval '1 hour' or v_sub.status <> 'pending' then
    raise exception 'Unable to attach files to this submission.';
  end if;

  select * into v_settings from public.app_settings where id = 1;

  for v_file in select * from jsonb_array_elements(coalesce(p_files, '[]'::jsonb))
  loop
    v_name := nullif(trim(v_file->>'file_name'), '');
    v_path := nullif(trim(v_file->>'file_path'), '');
    v_mime := nullif(trim(v_file->>'mime_type'), '');
    begin
      v_size := (v_file->>'file_size')::bigint;
      v_question := nullif(v_file->>'question_id', '')::uuid;
    exception
      when others then
        raise exception 'One of the uploaded files could not be saved.';
    end;

    if v_name is null or v_path is null or v_mime is null or v_size is null or v_size <= 0 then
      raise exception 'One of the uploaded files could not be saved.';
    end if;

    if v_size > (v_settings.max_file_size_mb * 1024 * 1024) then
      raise exception 'A file exceeds the maximum allowed size.';
    end if;

    if v_path not like 'uploads/%' or v_path like '%..%' then
      raise exception 'One of the uploaded files could not be saved.';
    end if;

    v_ext := lower(regexp_replace(v_name, '.*\.', ''));
    v_allowed := v_ext = any (v_settings.allowed_file_types);
    if not v_allowed then
      raise exception 'A file type is not allowed.';
    end if;

    insert into public.submission_files (
      submission_id, question_id, file_name, file_path, file_size, mime_type
    ) values (
      p_submission_id, v_question, left(v_name, 180), v_path, v_size, v_mime
    );
  end loop;
exception
  when others then
    if sqlerrm like 'Unable %'
       or sqlerrm like 'A file%'
       or sqlerrm like 'One of %' then
      raise;
    end if;
    raise exception 'Unable to save uploaded files. Please try again.';
end;
$$;

create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'total_submissions', (select count(*) from public.submissions),
    'pending', (select count(*) from public.submissions where status = 'pending'),
    'reviewed', (select count(*) from public.submissions where status = 'reviewed'),
    'this_week', (select count(*) from public.submissions where created_at >= date_trunc('week', now())),
    'this_month', (select count(*) from public.submissions where created_at >= date_trunc('month', now())),
    'new_submissions', (
      select count(*) from public.submissions
      where status = 'pending' and created_at >= now() - interval '7 days'
    ),
    'total_employees', (select count(*) from public.employees where is_active = true),
    'by_department', (
      select coalesce(
        jsonb_agg(jsonb_build_object('name', c.department_name, 'count', c.cnt) order by c.cnt desc),
        '[]'::jsonb
      )
      from (
        select department_name, count(*)::int as cnt
        from public.submissions
        group by department_name
      ) c
    ),
    'over_time', (
      select coalesce(
        jsonb_agg(jsonb_build_object('date', t.day, 'count', t.cnt) order by t.day),
        '[]'::jsonb
      )
      from (
        select created_at::date as day, count(*)::int as cnt
        from public.submissions
        where created_at >= now() - interval '30 days'
        group by 1
      ) t
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.departments enable row level security;
alter table public.submission_types enable row level security;
alter table public.employees enable row level security;
alter table public.admin_users enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.app_settings enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;
alter table public.submission_files enable row level security;
alter table public.admin_notes enable row level security;
alter table public.notification_queue enable row level security;

-- Departments
drop policy if exists departments_select_active on public.departments;
create policy departments_select_active on public.departments
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists departments_admin_write on public.departments;
create policy departments_admin_write on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Submission types
drop policy if exists submission_types_select_active on public.submission_types;
create policy submission_types_select_active on public.submission_types
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists submission_types_admin_write on public.submission_types;
create policy submission_types_admin_write on public.submission_types
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Employees (never public)
drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all on public.employees
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin users
drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists admin_users_super_write on public.admin_users;
create policy admin_users_super_write on public.admin_users
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Questions / options
drop policy if exists questions_select_active on public.questions;
create policy questions_select_active on public.questions
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists questions_admin_write on public.questions;
create policy questions_admin_write on public.questions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists question_options_select on public.question_options;
create policy question_options_select on public.question_options
  for select to anon, authenticated
  using (
    is_active = true
    or public.is_admin()
  );

drop policy if exists question_options_admin_write on public.question_options;
create policy question_options_admin_write on public.question_options
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Settings: admins only (public fields go through get_public_settings)
drop policy if exists app_settings_admin_select on public.app_settings;
create policy app_settings_admin_select on public.app_settings
  for select to authenticated
  using (public.is_admin());

drop policy if exists app_settings_super_update on public.app_settings;
create policy app_settings_super_update on public.app_settings
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Submissions: public writes only through submit_form (security definer).
-- No direct insert/select for anon.
drop policy if exists submissions_admin_all on public.submissions;
create policy submissions_admin_all on public.submissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists submission_answers_admin_all on public.submission_answers;
create policy submission_answers_admin_all on public.submission_answers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists submission_files_admin_all on public.submission_files;
create policy submission_files_admin_all on public.submission_files
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admin_notes_admin_all on public.admin_notes;
create policy admin_notes_admin_all on public.admin_notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists notification_queue_admin_select on public.notification_queue;
create policy notification_queue_admin_select on public.notification_queue
  for select to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.departments, public.submission_types, public.questions, public.question_options
  to anon, authenticated;

grant select, insert, update, delete on public.departments, public.submission_types, public.employees,
  public.questions, public.question_options, public.submissions, public.submission_answers,
  public.submission_files, public.admin_notes, public.admin_users, public.app_settings
  to authenticated;

grant select on public.notification_queue to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.get_public_settings() to anon, authenticated;
grant execute on function public.lookup_employee(text) to anon, authenticated;
grant execute on function public.submit_form(jsonb) to anon, authenticated;
grant execute on function public.attach_submission_files(uuid, jsonb) to anon, authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;
create or replace function public.claim_admin_invite()
returns public.admin_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_users;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email = '' then
    raise exception 'Not authenticated';
  end if;

  update public.admin_users
  set user_id = auth.uid(),
      updated_at = now()
  where lower(email) = v_email
    and is_active = true
    and (user_id is null or user_id = auth.uid())
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true;
  end if;

  if v_row.id is null then
    return null;
  end if;

  return v_row;
end;
$$;

grant execute on function public.bootstrap_admin() to authenticated;
grant execute on function public.claim_admin_invite() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-files',
  'submission-files',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists submission_files_anon_upload on storage.objects;
create policy submission_files_anon_upload on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'submission-files'
    and (storage.foldername(name))[1] = 'uploads'
  );

drop policy if exists submission_files_admin_read on storage.objects;
create policy submission_files_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'submission-files' and public.is_admin());

drop policy if exists submission_files_admin_delete on storage.objects;
create policy submission_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'submission-files' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Default settings row
-- ---------------------------------------------------------------------------

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

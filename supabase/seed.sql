-- Optional starter data. Run after schema.sql.
-- Safe to re-run: uses ON CONFLICT / existence checks.

insert into public.departments (name, description)
values
  ('IT', 'Information technology'),
  ('Safety', 'Health, safety, and environment'),
  ('HR', 'Human resources'),
  ('Production', 'Mine production operations'),
  ('Store', 'Stores and inventory'),
  ('Maintenance', 'Plant and equipment maintenance'),
  ('Finance', 'Finance and accounting')
on conflict (name) do nothing;

update public.departments
set is_active = false
where name not in ('IT', 'Safety', 'HR', 'Production', 'Store', 'Maintenance', 'Finance');

insert into public.submission_types (name, description)
values
  ('Employee Spotlight', 'Employee spotlight questionnaire')
on conflict (name) do nothing;

update public.submission_types
set is_active = false
where name <> 'Employee Spotlight';

update public.questions set is_active = false;

insert into public.questions (label, help_text, placeholder, field_type, is_required, is_active, sort_order)
select * from (
  values
    ('What inspired you to pursue a career in mining?', null, 'Share what first drew you to mining', 'long_text', true, true, 10),
    ('What has been your biggest lesson or experience since joining the industry?', null, 'Describe a lesson or experience that has stayed with you', 'long_text', true, true, 20),
    ('Where do you see yourself professionally in the next five years?', null, 'Tell us about your professional goals', 'long_text', true, true, 30),
    ('What message would you share with young people who aspire to build a career in the mining industry?', null, 'Write a message for the next generation', 'long_text', true, true, 40)
) as q(label, help_text, placeholder, field_type, is_required, is_active, sort_order)
where not exists (
  select 1 from public.questions existing where existing.label = q.label
);

update public.questions
set is_active = true,
    is_required = true,
    field_type = 'long_text'
where label in (
  'What inspired you to pursue a career in mining?',
  'What has been your biggest lesson or experience since joining the industry?',
  'Where do you see yourself professionally in the next five years?',
  'What message would you share with young people who aspire to build a career in the mining industry?'
);

update public.app_settings
set organization_name = 'Employee Spotlight'
where id = 1;

insert into public.employees (full_name, employee_id, email, department_id, is_active)
select 'Alex Rivera', 'EMP-1001', 'alex.rivera@example.com', d.id, true
from public.departments d
where d.name = 'Production'
  and not exists (select 1 from public.employees e where lower(e.employee_id) = 'emp-1001');

insert into public.employees (full_name, employee_id, email, department_id, is_active)
select 'Jordan Lee', 'EMP-1002', 'jordan.lee@example.com', d.id, true
from public.departments d
where d.name = 'HR'
  and not exists (select 1 from public.employees e where lower(e.employee_id) = 'emp-1002');

insert into public.employees (full_name, employee_id, email, department_id, is_active)
select 'Sam Patel', 'EMP-1003', 'sam.patel@example.com', d.id, true
from public.departments d
where d.name = 'Finance'
  and not exists (select 1 from public.employees e where lower(e.employee_id) = 'emp-1003');

-- Optional starter data. Run after schema.sql.
-- Safe to re-run: uses ON CONFLICT / existence checks.

insert into public.departments (name, description)
values
  ('Human Resources', 'People operations and employee services'),
  ('Engineering', 'Product engineering and technology'),
  ('Finance', 'Accounting, payroll, and procurement'),
  ('Operations', 'Facilities and business operations'),
  ('Sales', 'Revenue and account management'),
  ('Marketing', 'Brand, communications, and growth')
on conflict (name) do nothing;

insert into public.submission_types (name, description)
values
  ('General', 'General employee submission'),
  ('Expense Report', 'Reimbursement and expense documentation'),
  ('Time Off Request', 'Leave and absence requests'),
  ('Feedback', 'Workplace feedback and suggestions'),
  ('Incident Report', 'Safety or workplace incident reports')
on conflict (name) do nothing;

insert into public.questions (label, help_text, placeholder, field_type, is_required, is_active, sort_order)
select * from (
  values
    ('What is the purpose of this submission?', 'Provide a short summary so reviewers can triage quickly.', 'Brief summary', 'short_text', true, true, 10),
    ('Please describe the details', 'Include dates, amounts, people involved, or other context.', 'Provide a detailed description', 'long_text', true, true, 20),
    ('Priority', 'How urgently should this be reviewed?', null, 'dropdown', true, true, 30),
    ('Which of the following apply?', 'Select every option that is relevant.', null, 'checkboxes', false, true, 40),
    ('Preferred contact method', null, null, 'multiple_choice', false, true, 50),
    ('Related date', 'If this submission relates to a specific date, enter it here.', null, 'date', false, true, 60),
    ('Amount (if applicable)', 'Enter a number only. Leave blank if not applicable.', '0.00', 'number', false, true, 70),
    ('Supporting document', 'Optional. You can also use the general upload section below.', null, 'file', false, true, 80)
) as q(label, help_text, placeholder, field_type, is_required, is_active, sort_order)
where not exists (select 1 from public.questions);

insert into public.question_options (question_id, label, value, sort_order)
select q.id, o.label, o.value, o.sort_order
from public.questions q
join (
  values
    ('Priority', 'Low', 'low', 1),
    ('Priority', 'Normal', 'normal', 2),
    ('Priority', 'High', 'high', 3),
    ('Which of the following apply?', 'Requires follow-up', 'follow_up', 1),
    ('Which of the following apply?', 'Confidential', 'confidential', 2),
    ('Which of the following apply?', 'Affects multiple departments', 'cross_department', 3),
    ('Preferred contact method', 'Email', 'email', 1),
    ('Preferred contact method', 'Phone', 'phone', 2),
    ('Preferred contact method', 'In person', 'in_person', 3)
) as o(question_label, label, value, sort_order)
  on o.question_label = q.label
where not exists (
  select 1 from public.question_options existing
  where existing.question_id = q.id and existing.value = o.value
);

insert into public.employees (full_name, employee_id, email, department_id, is_active)
select 'Alex Rivera', 'EMP-1001', 'alex.rivera@example.com', d.id, true
from public.departments d
where d.name = 'Engineering'
  and not exists (select 1 from public.employees e where lower(e.employee_id) = 'emp-1001');

insert into public.employees (full_name, employee_id, email, department_id, is_active)
select 'Jordan Lee', 'EMP-1002', 'jordan.lee@example.com', d.id, true
from public.departments d
where d.name = 'Human Resources'
  and not exists (select 1 from public.employees e where lower(e.employee_id) = 'emp-1002');

insert into public.employees (full_name, employee_id, email, department_id, is_active)
select 'Sam Patel', 'EMP-1003', 'sam.patel@example.com', d.id, true
from public.departments d
where d.name = 'Finance'
  and not exists (select 1 from public.employees e where lower(e.employee_id) = 'emp-1003');

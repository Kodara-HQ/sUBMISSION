# Employee Submission Portal

A production-oriented Next.js portal for employee form submissions and administrator review. Employees use a public form. Administrators sign in with Supabase Auth to search, review, and manage submissions, questions, employees, and departments.

## What is implemented

- Public employee form at `/employee-submit`
- Configurable questions (short text, long text, multiple choice, checkboxes, dropdown, date, number, file)
- Optional file uploads to private Supabase Storage
- Duplicate-submission protection (same employee identifier + type + date)
- Confirmation: “Your submission has been received successfully. Thank you.”
- Secure admin area at `/admin` (Dashboard, Submissions, Employees, Departments, Questions, Settings)
- Search, filters, status changes, deletion, signed file downloads, CSV/Excel export
- Internal admin notes (not visible to employees)
- Department, employee, question, and submission-type management
- Dashboard statistics and charts
- Row Level Security on all tables
- Notification queue for later email/webhook delivery

## Database tables

| Table | Purpose |
| --- | --- |
| `departments` | Organization departments |
| `submission_types` | Configurable submission types |
| `employees` | Employee directory |
| `admin_users` | Authorized administrators linked to Auth users |
| `questions` | Dynamic form questions |
| `question_options` | Options for choice questions |
| `app_settings` | Organization, upload, and notification settings |
| `submissions` | Submitted forms |
| `submission_answers` | Answers (labels stored for history) |
| `submission_files` | File metadata |
| `admin_notes` | Internal review notes |
| `notification_queue` | Events for future email/webhook delivery |

SQL scripts:

- `supabase/schema.sql` — tables, indexes, triggers, RLS, RPCs, storage bucket
- `supabase/seed.sql` — starter departments, types, questions, sample employees
- `supabase/bootstrap-admin.sql` — first super administrator

## Required environment variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_jwt_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
ADMIN_BOOTSTRAP_EMAIL=admin@your-organization.com
```

- Prefer `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT anon key). `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is also accepted as a fallback.
- These keys are safe for the browser when RLS is enabled. Never put the **service role** key in `NEXT_PUBLIC_*` variables or client code.
- `ADMIN_BOOTSTRAP_EMAIL` is used only on the server. The first sign-in with this email can create the first super administrator if `admin_users` is empty.

## Supabase configuration

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Run `supabase/seed.sql` (optional but recommended).
4. **Authentication → Providers → Email**: enable Email. Turn **off** public sign-ups so only invited/created users can become administrators.
5. **Authentication → URL configuration**:
   - Site URL: `http://localhost:3000` locally, then your Vercel URL in production
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://YOUR_DOMAIN/auth/callback`
6. Confirm Storage bucket `submission-files` exists (created by `schema.sql`) and is **private**.
7. Optional: Database Webhook on `notification_queue` INSERT → your email provider or `notification_webhook_url`.

## Creating the first administrator

**Option A — bootstrap email (recommended)**

1. In Supabase **Authentication → Users**, add a user with the same email as `ADMIN_BOOTSTRAP_EMAIL`.
2. Start the app and sign in at `/login`.
3. If no administrators exist, the app calls `/api/admin/bootstrap` and creates a `super_admin`.

**Option B — SQL**

1. Create the Auth user.
2. Replace the email in `supabase/bootstrap-admin.sql` and run it in the SQL Editor.

Additional administrators: add them in **Settings** (super admin), then create matching Auth users in Supabase.

## Run locally

```bash
npm install
cp .env.example .env.local
# edit .env.local
npm run dev
```

Open:

- Employee form: http://localhost:3000/employee-submit
- Admin sign-in: http://localhost:3000/login

Share `/employee-submit` with employees. Do not share `/admin`.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel (Next.js preset).
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), and `ADMIN_BOOTSTRAP_EMAIL`. Do **not** set `NEXT_PUBLIC_DEMO_MODE=true`.
4. Add the production URL to Supabase Auth redirect URLs and Site URL.
5. Deploy.

No service role key is required for the application.

## Security notes

- Employees submit through `submit_form` and `attach_submission_files` (security definer RPCs). They cannot read other submissions.
- Admin routes require a Supabase session **and** an active `admin_users` row.
- Files are stored in a private bucket; administrators download via short-lived signed URLs.
- Inputs are validated in the UI and again in the database.
- User-facing errors do not expose credentials or raw database errors.

## Remaining improvements

- Send email from `notification_queue` (Resend, SES, or a Database Webhook)
- Invite administrators by email (requires a server-only service role key)
- Rate limiting / CAPTCHA on the public form
- Audit log of admin actions
- Multi-file answers per question
- Dark mode and custom logo upload
- Automated tests (Playwright / integration tests against a Supabase branch)

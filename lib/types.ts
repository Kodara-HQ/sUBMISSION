export type FieldType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "date"
  | "number"
  | "file";

export type SubmissionStatus = "pending" | "reviewed";
export type AdminRole = "admin" | "super_admin";

export type PublicSettings = {
  organization_name: string;
  allowed_file_types: string[];
  max_file_size_mb: number;
  require_known_employee: boolean;
  prevent_duplicate_same_day: boolean;
};

export type AppSettings = PublicSettings & {
  id: number;
  notification_email: string | null;
  notification_webhook_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SubmissionType = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  full_name: string;
  employee_id: string | null;
  email: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments?: Pick<Department, "id" | "name"> | null;
};

export type AdminUser = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type QuestionOption = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
  is_active: boolean;
};

export type Question = {
  id: string;
  label: string;
  help_text: string | null;
  placeholder: string | null;
  field_type: FieldType;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  submission_type_id: string | null;
  created_at: string;
  updated_at: string;
  question_options?: QuestionOption[];
};

export type Submission = {
  id: string;
  employee_id: string | null;
  employee_full_name: string;
  employee_identifier: string;
  department_id: string | null;
  department_name: string;
  submission_type_id: string | null;
  submission_type_name: string;
  submission_date: string;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
};

export type SubmissionAnswer = {
  id: string;
  submission_id: string;
  question_id: string | null;
  question_label: string;
  field_type: FieldType;
  answer_text: string | null;
  answer_json: string[] | null;
  created_at: string;
};

export type SubmissionFile = {
  id: string;
  submission_id: string;
  question_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};

export type AdminNote = {
  id: string;
  submission_id: string;
  admin_user_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
  admin_users?: Pick<AdminUser, "id" | "full_name" | "email"> | null;
};

export type DashboardStats = {
  total_submissions: number;
  pending: number;
  reviewed: number;
  this_week: number;
  this_month: number;
  new_submissions: number;
  total_employees: number;
  by_department: { name: string; count: number }[];
  over_time: { date: string; count: number }[];
};

export type FormAnswerPayload = {
  question_id: string;
  answer_text?: string | null;
  answer_json?: string[] | null;
};

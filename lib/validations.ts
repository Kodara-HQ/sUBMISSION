import { ACCEPT_BY_EXT, MIME_BY_EXT } from "@/lib/constants";
import { fileExtension } from "@/lib/utils";
import type { FieldType, PublicSettings, Question } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Record<string, string>;

export function isEmail(value: string) {
  return EMAIL_RE.test(value);
}

export function validateEmployeeFields(input: {
  fullName: string;
  identifier: string;
  departmentId: string;
  submissionTypeId: string;
  submissionDate: string;
  anonymous?: boolean;
}) {
  const errors: FieldErrors = {};
  const fullName = input.fullName.trim();
  const identifier = input.identifier.trim();

  if (!input.submissionTypeId) errors.submissionTypeId = "Select a submission type.";
  if (!input.submissionDate) errors.submissionDate = "Select a submission date.";

  if (input.anonymous) {
    if (!input.departmentId) errors.departmentId = "Select a department.";
    return errors;
  }

  if (fullName.length < 2) errors.fullName = "Enter the employee’s full name.";
  if (fullName.length > 120) errors.fullName = "Name is too long.";
  if (identifier.length < 2) errors.identifier = "Enter a job title.";
  if (identifier.length > 120) errors.identifier = "Job title is too long.";
  if (!input.departmentId) errors.departmentId = "Select a department.";

  return errors;
}

export function validateQuestionAnswer(question: Question, value: unknown) {
  if (!question.is_required) {
    if (question.field_type === "checkboxes" && Array.isArray(value) && value.length === 0) {
      return "";
    }
    return "";
  }

  if (question.field_type === "checkboxes") {
    if (!Array.isArray(value) || value.length === 0) {
      return "Select at least one option.";
    }
    return "";
  }

  if (question.field_type === "file") {
    if (!(value instanceof File) && value !== "uploaded") {
      return "Upload a file for this question.";
    }
    return "";
  }

  const text = String(value ?? "").trim();
  if (!text) return "This question is required.";
  return "";
}

export function acceptAttribute(allowed: string[]) {
  return allowed
    .map((ext) => ACCEPT_BY_EXT[ext.toLowerCase()] || `.${ext}`)
    .filter(Boolean)
    .join(",");
}

export function validateUpload(file: File, settings: PublicSettings) {
  const ext = fileExtension(file.name);
  if (!settings.allowed_file_types.map((item) => item.toLowerCase()).includes(ext)) {
    return `File type .${ext || "unknown"} is not allowed.`;
  }
  const allowedMimes = MIME_BY_EXT[ext] || [];
  if (file.type && allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
    return "This file type is not allowed.";
  }
  const maxBytes = settings.max_file_size_mb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is too large. Maximum size is ${settings.max_file_size_mb} MB.`;
  }
  if (file.size <= 0) {
    return "The selected file is empty.";
  }
  return "";
}

export function emptyAnswer(type: FieldType): string | string[] | File | null {
  if (type === "checkboxes") return [];
  if (type === "file") return null;
  return "";
}

import type { Question, Submission, SubmissionAnswer, SubmissionFile } from "@/lib/types";
import { downloadTextFile, formatDate, formatDateTime } from "@/lib/utils";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function answerDisplay(answer: SubmissionAnswer | undefined, files: SubmissionFile[]) {
  if (!answer) return "";
  if (answer.field_type === "checkboxes") {
    return (answer.answer_json || []).join("; ");
  }
  if (answer.field_type === "file") {
    return files
      .filter((file) => file.question_id === answer.question_id)
      .map((file) => file.file_name)
      .join("; ");
  }
  return answer.answer_text || "";
}

export function exportSubmissionsCsv(
  submissions: Submission[],
  answersBySubmission: Record<string, SubmissionAnswer[]>,
  filesBySubmission: Record<string, SubmissionFile[]>,
  questions: Pick<Question, "id" | "label">[],
) {
  const headers = [
    "Reference",
    "Employee name",
    "Job title",
    "Department",
    "Submission type",
    "Submission date",
    "Status",
    "Submitted at",
    ...questions.map((question) => question.label),
    "Uploaded files",
  ];

  const rows = submissions.map((submission) => {
    const answers = answersBySubmission[submission.id] || [];
    const files = filesBySubmission[submission.id] || [];
    const answerMap = new Map(answers.map((answer) => [answer.question_id, answer]));
    return [
      submission.id,
      submission.employee_full_name,
      submission.employee_identifier,
      submission.department_name,
      submission.submission_type_name,
      formatDate(submission.submission_date),
      submission.status,
      formatDateTime(submission.created_at),
      ...questions.map((question) =>
        answerDisplay(answerMap.get(question.id), files),
      ),
      files.map((file) => file.file_name).join("; "),
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(`submissions-${stamp}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Hint, Label, Textarea } from "@/components/ui/fields";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAdmin } from "@/components/admin/admin-context";
import { STORAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type {
  AdminNote,
  Submission,
  SubmissionAnswer,
  SubmissionFile,
  SubmissionStatus,
} from "@/lib/types";
import { formatBytes, formatDate, formatDateTime, publicErrorMessage, shortId } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function answerValue(answer: SubmissionAnswer) {
  if (answer.field_type === "checkboxes") {
    return (answer.answer_json || []).join(", ") || "—";
  }
  return answer.answer_text?.trim() || "—";
}

export function SubmissionDetail({ id }: { id: string }) {
  const router = useRouter();
  const admin = useAdmin();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<SubmissionAnswer[]>([]);
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const validId = UUID_RE.test(id);

  const load = useCallback(async () => {
    const [subRes, ansRes, fileRes, noteRes] = await Promise.all([
      supabase.from("submissions").select("*").eq("id", id).maybeSingle(),
      supabase.from("submission_answers").select("*").eq("submission_id", id).order("created_at"),
      supabase.from("submission_files").select("*").eq("submission_id", id).order("created_at"),
      supabase
        .from("admin_notes")
        .select("*, admin_users(id, full_name, email)")
        .eq("submission_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setSubmission((subRes.data as Submission | null) ?? null);
    setAnswers((ansRes.data || []) as SubmissionAnswer[]);
    setFiles((fileRes.data || []) as SubmissionFile[]);
    setNotes((noteRes.data || []) as AdminNote[]);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      const [subRes, ansRes, fileRes, noteRes] = await Promise.all([
        supabase.from("submissions").select("*").eq("id", id).maybeSingle(),
        supabase.from("submission_answers").select("*").eq("submission_id", id).order("created_at"),
        supabase.from("submission_files").select("*").eq("submission_id", id).order("created_at"),
        supabase
          .from("admin_notes")
          .select("*, admin_users(id, full_name, email)")
          .eq("submission_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setSubmission((subRes.data as Submission | null) ?? null);
      setAnswers((ansRes.data || []) as SubmissionAnswer[]);
      setFiles((fileRes.data || []) as SubmissionFile[]);
      setNotes((noteRes.data || []) as AdminNote[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase, validId]);

  async function setStatus(next: SubmissionStatus) {
    if (!submission) return;
    setUpdating(true);
    const { error } = await supabase.from("submissions").update({ status: next }).eq("id", submission.id);
    setUpdating(false);
    if (error) {
      toast.push("The status could not be updated.", "error");
      return;
    }
    setSubmission({ ...submission, status: next });
    toast.push(`Marked as ${next === "reviewed" ? "reviewed" : "pending"}.`, "success");
  }

  async function downloadFile(file: SubmissionFile) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(file.file_path, 60, { download: file.file_name });
    if (error || !data?.signedUrl) {
      toast.push("The file could not be downloaded.", "error");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    const text = note.trim();
    if (text.length < 1) {
      setNoteError("Enter a note.");
      return;
    }
    setNoteError("");
    setSavingNote(true);
    const { error } = await supabase.from("admin_notes").insert({
      submission_id: id,
      admin_user_id: admin.id,
      note: text,
    });
    setSavingNote(false);
    if (error) {
      toast.push(publicErrorMessage(error, "The note could not be saved."), "error");
      return;
    }
    setNote("");
    toast.push("Note added.", "success");
    load();
  }

  async function removeSubmission() {
    if (!submission) return;
    setDeleting(true);
    if (files.length) {
      await supabase.storage.from(STORAGE_BUCKET).remove(files.map((file) => file.file_path));
    }
    const { error } = await supabase.from("submissions").delete().eq("id", submission.id);
    setDeleting(false);
    if (error) {
      toast.push("The submission could not be deleted.", "error");
      return;
    }
    toast.push("Submission deleted.", "success");
    router.replace("/admin/submissions");
  }

  if (!validId) {
    return (
      <div>
        <PageHeader title="Submission" />
        <Alert tone="error">This submission was not found or you do not have permission to view it.</Alert>
        <Link href="/admin/submissions" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  if (loading) return <Spinner label="Loading submission" />;

  if (!submission) {
    return (
      <div>
        <PageHeader title="Submission" />
        <Alert tone="error">This submission was not found or you do not have permission to view it.</Alert>
        <Link href="/admin/submissions" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  const questionFiles = (questionId: string | null) =>
    files.filter((file) => (questionId ? file.question_id === questionId : !file.question_id));
  const generalFiles = questionFiles(null);

  return (
    <div>
      <PageHeader
        title={submission.employee_full_name}
        description={`Reference ${shortId(submission.id)} · Submitted ${formatDateTime(submission.created_at)}`}
        actions={
          <>
            {submission.status === "pending" ? (
              <Button onClick={() => setStatus("reviewed")} disabled={updating}>
                Mark reviewed
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setStatus("pending")} disabled={updating}>
                Mark pending
              </Button>
            )}
            <Button variant="danger" onClick={() => setPendingDelete(true)}>
              Delete
            </Button>
            <Link
              href="/admin/submissions"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium hover:bg-slate-50"
            >
              Back
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Employee information" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Full name</p>
                <p className="font-medium text-navy">{submission.employee_full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Employee ID / email</p>
                <p className="font-medium text-navy">{submission.employee_identifier}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Department</p>
                <p className="font-medium text-navy">{submission.department_name}</p>
              </div>
              {submission.employee_id ? (
                <div>
                  <p className="text-xs text-muted">Directory record</p>
                  <Link href={`/admin/employees/${submission.employee_id}`} className="font-medium text-accent hover:underline">
                    View employee
                  </Link>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Submission information" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Submission type</p>
                <p className="font-medium text-navy">{submission.submission_type_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Submission date</p>
                <p className="font-medium text-navy">{formatDate(submission.submission_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Received</p>
                <p className="font-medium text-navy">{formatDateTime(submission.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Review status</p>
                <Badge tone={submission.status === "reviewed" ? "success" : "warning"}>
                  {submission.status === "reviewed" ? "Reviewed" : "Pending"}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Questions and answers" />
            <CardBody className="space-y-5">
              {answers.length === 0 ? (
                <p className="text-sm text-muted">No question answers were recorded.</p>
              ) : (
                answers.map((answer) => {
                  const related = questionFiles(answer.question_id);
                  return (
                    <div key={answer.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-navy">{answer.question_label}</p>
                      {answer.field_type === "file" ? (
                        related.length ? (
                          <ul className="mt-2 space-y-1">
                            {related.map((file) => (
                              <li key={file.id}>
                                <button
                                  type="button"
                                  className="text-sm text-accent hover:underline"
                                  onClick={() => downloadFile(file)}
                                >
                                  {file.file_name} ({formatBytes(file.file_size)})
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-muted">No file uploaded.</p>
                        )
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm">{answerValue(answer)}</p>
                      )}
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Uploaded files" description="Files are private. Downloads use a short-lived signed link." />
            {files.length === 0 ? (
              <EmptyState title="No files" description="This submission does not include uploaded files." />
            ) : (
              <CardBody>
                <ul className="space-y-2">
                  {(generalFiles.length ? files : files).map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>
                        {file.file_name} ({formatBytes(file.file_size)})
                        {!file.question_id ? <span className="text-muted"> · general attachment</span> : null}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => downloadFile(file)}>
                        Download
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Admin notes"
              description="Internal only. Employees cannot see these notes."
            />
            <CardBody>
              <form onSubmit={addNote} className="space-y-3">
                <div>
                  <Label htmlFor="note" required>
                    Add a note
                  </Label>
                  <Textarea
                    id="note"
                    value={note}
                    maxLength={4000}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <Hint>Visible only to administrators.</Hint>
                  <FieldError message={noteError} />
                </div>
                <Button type="submit" disabled={savingNote}>
                  {savingNote ? "Saving…" : "Save note"}
                </Button>
              </form>
              <div className="mt-6 space-y-4">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted">No notes yet.</p>
                ) : (
                  notes.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-3">
                      <p className="whitespace-pre-wrap text-sm">{item.note}</p>
                      <p className="mt-2 text-xs text-muted">
                        {item.admin_users?.full_name || "Administrator"} · {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={pendingDelete}
        title="Delete submission?"
        description="This permanently removes the submission, answers, notes, and uploaded files."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onClose={() => setPendingDelete(false)}
        onConfirm={removeSubmission}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { QuestionField } from "@/components/employee/question-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FieldError, Input, Label, Select } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";
import { STORAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, setRuntimeSupabaseConfig } from "@/lib/supabase/env";
import type {
  Department,
  FormAnswerPayload,
  PublicSettings,
  Question,
  SubmissionType,
} from "@/lib/types";
import {
  publicErrorMessage,
  sanitizeFileName,
  shortId,
  todayISODate,
} from "@/lib/utils";
import {
  emptyAnswer,
  validateEmployeeFields,
  validateQuestionAnswer,
  validateUpload,
  type FieldErrors,
} from "@/lib/validations";

type AnswerValue = string | string[] | File | null;
type BrowserClient = ReturnType<typeof createClient>;

const defaultSettings: PublicSettings = {
  organization_name: "Bloj Company LTD",
  allowed_file_types: ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"],
  max_file_size_mb: 10,
  require_known_employee: false,
  prevent_duplicate_same_day: true,
};

function isSafetyTipType(type: SubmissionType | undefined) {
  return (type?.name || "").trim().toLowerCase() === "safety tip";
}

function isSpotlightType(type: SubmissionType | undefined) {
  return (type?.name || "").trim().toLowerCase() === "employee spotlight";
}

function matchRequestedType(types: SubmissionType[], requested: string) {
  const key = requested.trim().toLowerCase();
  if (!key) return undefined;
  if (key === "safety" || key === "safety-tip" || key === "safety_tip" || key === "tip") {
    return types.find(isSafetyTipType);
  }
  if (key === "spotlight" || key === "employee-spotlight" || key === "employee_spotlight") {
    return types.find(isSpotlightType);
  }
  return types.find((type) => type.name.trim().toLowerCase() === key);
}

async function resolveClient(): Promise<BrowserClient> {
  if (!isSupabaseConfigured()) {
    const response = await fetch("/api/public-config", { cache: "no-store" });
    const body = (await response.json()) as {
      configured?: boolean;
      url?: string;
      key?: string;
    };
    if (body.configured && body.url && body.key) {
      setRuntimeSupabaseConfig({ url: body.url, key: body.key });
    }
  }
  return createClient();
}

export function EmployeeForm() {
  const searchParams = useSearchParams();
  const requestedType = (searchParams.get("type") || "").trim();
  const typeLocked = Boolean(requestedType);

  const submittedRef = useRef(false);
  const [supabase, setSupabase] = useState<BrowserClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [types, setTypes] = useState<SubmissionType[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [submissionTypeId, setSubmissionTypeId] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState("");

  const selectedType = types.find((type) => type.id === submissionTypeId);
  const anonymous = isSafetyTipType(selectedType);
  const visibleQuestions = questions.filter(
    (question) =>
      !question.submission_type_id || question.submission_type_id === submissionTypeId,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const client = await resolveClient();
        if (cancelled) return;
        setSupabase(client);

        const [settingsRes, deptRes, typeRes, questionRes] = await Promise.all([
          client.rpc("get_public_settings"),
          client.from("departments").select("*").eq("is_active", true).order("name"),
          client.from("submission_types").select("*").eq("is_active", true).order("name"),
          client
            .from("questions")
            .select("*, question_options(*)")
            .eq("is_active", true)
            .order("sort_order"),
        ]);

        if (settingsRes.error || deptRes.error || typeRes.error || questionRes.error) {
          throw new Error("load");
        }

        if (cancelled) return;

        const row = Array.isArray(settingsRes.data) ? settingsRes.data[0] : settingsRes.data;
        if (row) setSettings(row as PublicSettings);
        const loadedDepartments = (deptRes.data || []) as Department[];
        const loadedTypes = (typeRes.data || []) as SubmissionType[];
        setDepartments(loadedDepartments);
        setTypes(loadedTypes);
        const loadedQuestions = ((questionRes.data || []) as Question[]).map((question) => ({
          ...question,
          submission_type_id: question.submission_type_id ?? null,
          question_options: (question.question_options || [])
            .filter((option) => option.is_active)
            .sort((a, b) => a.sort_order - b.sort_order),
        }));
        setQuestions(loadedQuestions);
        setAnswers((current) => {
          const next = { ...current };
          for (const question of loadedQuestions) {
            if (next[question.id] === undefined) next[question.id] = emptyAnswer(question.field_type);
          }
          return next;
        });
        const matched = matchRequestedType(loadedTypes, requestedType);
        if (matched) {
          setSubmissionTypeId(matched.id);
        } else if (loadedTypes.length === 1) {
          setSubmissionTypeId(loadedTypes[0].id);
        } else if (requestedType) {
          setFormError("That submission type is not available. Choose one below.");
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "The submission form could not connect to the database. In Vercel add SUPABASE_URL and SUPABASE_ANON_KEY, redeploy without build cache, and confirm schema.sql was run.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [requestedType]);

  useEffect(() => {
    if (!anonymous) return;
    const safetyDept = departments.find((department) => department.name.toLowerCase() === "safety");
    if (safetyDept && !departmentId) setDepartmentId(safetyDept.id);
  }, [anonymous, departments, departmentId]);

  function validate() {
    const next: FieldErrors = validateEmployeeFields({
      fullName,
      identifier,
      departmentId,
      submissionTypeId,
      submissionDate: todayISODate(),
      anonymous,
    });

    for (const question of visibleQuestions) {
      const message = validateQuestionAnswer(question, answers[question.id]);
      if (message) next[`q-${question.id}`] = message;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function uploadFile(submissionId: string, file: File, questionId?: string) {
    if (!supabase) throw new Error("Unable to submit the form. Please try again.");
    const path = `uploads/${submissionId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      throw new Error("A file could not be uploaded. Please try again.");
    }
    return {
      file_name: file.name.slice(0, 180),
      file_path: path,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      question_id: questionId || null,
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (submittedRef.current || submitting) return;
    if (!validate()) {
      setFormError("Please correct the highlighted fields before submitting.");
      return;
    }

    if (!supabase) {
      setFormError("Unable to submit the form. Please try again.");
      return;
    }

    setSubmitting(true);
    submittedRef.current = true;

    try {
      const payloadAnswers: FormAnswerPayload[] = visibleQuestions.map((question) => {
        const value = answers[question.id];
        if (question.field_type === "checkboxes") {
          return {
            question_id: question.id,
            answer_json: Array.isArray(value) ? value : [],
          };
        }
        if (question.field_type === "file") {
          return { question_id: question.id, answer_text: value instanceof File ? value.name : null };
        }
        return {
          question_id: question.id,
          answer_text: typeof value === "string" ? value.trim() : null,
        };
      });

      const { data, error } = await supabase.rpc("submit_form", {
        payload: {
          employee_full_name: anonymous ? "Anonymous" : fullName.trim(),
          employee_identifier: anonymous ? "Safety Tip" : identifier.trim(),
          department_id: departmentId,
          submission_type_id: submissionTypeId,
          submission_date: todayISODate(),
          answers: payloadAnswers,
        },
      });

      if (error) throw error;
      const submissionId = String(data);

      const uploads = visibleQuestions
        .filter((question) => question.field_type === "file" && answers[question.id] instanceof File)
        .map((question) => uploadFile(submissionId, answers[question.id] as File, question.id));

      if (uploads.length > 0) {
        const files = await Promise.all(uploads);
        const { error: attachError } = await supabase.rpc("attach_submission_files", {
          p_submission_id: submissionId,
          p_files: files,
        });
        if (attachError) {
          setSuccessId(submissionId);
          setFormError(
            "Your submission was received, but one or more files could not be attached. Please contact your administrator with your reference number.",
          );
          return;
        }
      }

      setSuccessId(submissionId);
    } catch (error) {
      submittedRef.current = false;
      setFormError(publicErrorMessage(error, "Unable to submit the form. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner label="Loading form" />;

  if (loadError) {
    return <Alert tone="error">{loadError}</Alert>;
  }

  if (successId) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-semibold text-navy">Submission received</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Your submission has been received successfully. Thank you.
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            Administrators can open it in the dashboard under Submissions.
          </p>
          <p className="mt-4 text-sm text-muted">
            Reference number: <span className="font-medium text-navy">{shortId(successId)}</span>
          </p>
          {formError ? <p className="mx-auto mt-4 max-w-lg text-sm text-warning">{formError}</p> : null}
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      {typeLocked && selectedType ? (
        <Card>
          <CardBody className="py-4">
            <p className="text-sm font-medium text-accent">
              {anonymous ? "Safety Tip" : "Employee Spotlight"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {anonymous
                ? "Anonymous tip — your name is not collected."
                : "Spotlight questionnaire with your name and role."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="What are you submitting?"
            description="Your choice controls the questions and whether your name is collected."
          />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Submission type">
              {types.map((type) => {
                const selected = submissionTypeId === type.id;
                const tip = isSafetyTipType(type);
                return (
                  <button
                    key={type.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSubmissionTypeId(type.id);
                      setErrors({});
                      setFormError("");
                    }}
                    className={
                      selected
                        ? "rounded-xl border-2 border-accent bg-accent-soft/40 p-4 text-left shadow-sm"
                        : "rounded-xl border border-border bg-white p-4 text-left hover:border-accent/50"
                    }
                  >
                    <p className="font-semibold text-navy">{type.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {tip
                        ? "One anonymous tip. No name required."
                        : "Spotlight questionnaire with your name and role."}
                    </p>
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.submissionTypeId} />
          </CardBody>
        </Card>
      )}

      {!anonymous && submissionTypeId ? (
        <Card>
          <CardHeader
            title="Employee information"
            description="Tell us who you are and your role at the organization."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="fullName" required>
                Employee full name
              </Label>
              <Input
                id="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
              />
              <FieldError id="fullName-error" message={errors.fullName} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="identifier" required>
                Job title
              </Label>
              <Input
                id="identifier"
                autoComplete="organization-title"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? "identifier-error" : undefined}
              />
              <FieldError id="identifier-error" message={errors.identifier} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="department" required>
                Department
              </Label>
              <Select
                id="department"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                required
                aria-invalid={Boolean(errors.departmentId)}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.departmentId} />
            </div>
          </CardBody>
        </Card>
      ) : null}

      {anonymous ? (
        <Alert tone="info" title="Anonymous safety tip">
          You do not need to enter your name. Only share the tip below.
        </Alert>
      ) : null}

      {submissionTypeId && visibleQuestions.length > 0 ? (
        <Card>
          <CardHeader
            title={anonymous ? "Safety tip" : "Questions"}
            description={
              anonymous
                ? "Share one tip that could help keep others safe."
                : "Required fields are marked with an asterisk."
            }
          />
          <CardBody className="space-y-5">
            {visibleQuestions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                value={answers[question.id] ?? emptyAnswer(question.field_type)}
                error={errors[`q-${question.id}`]}
                settings={settings}
                onChange={(value) => {
                  setAnswers((current) => ({ ...current, [question.id]: value }));
                  if (question.field_type === "file" && value instanceof File) {
                    const message = validateUpload(value, settings);
                    setErrors((current) => ({ ...current, [`q-${question.id}`]: message }));
                  }
                }}
              />
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" size="lg" disabled={submitting || !submissionTypeId}>
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </form>
  );
}

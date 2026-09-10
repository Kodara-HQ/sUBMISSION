"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Hint, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { FIELD_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { FieldType, Question } from "@/lib/types";
import { fieldTypeLabel, needsOptions, publicErrorMessage } from "@/lib/utils";

type OptionDraft = { id?: string; label: string; value: string };

type FormState = {
  label: string;
  help_text: string;
  placeholder: string;
  field_type: FieldType;
  is_required: boolean;
  is_active: boolean;
  options: OptionDraft[];
};

const emptyForm: FormState = {
  label: "",
  help_text: "",
  placeholder: "",
  field_type: "short_text",
  is_required: false,
  is_active: true,
  options: [],
};

function slugify(label: string) {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "option"
  );
}

export function QuestionsManager() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [rows, setRows] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Question | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("questions")
      .select("*, question_options(*)")
      .order("sort_order")
      .order("created_at");
    if (error) toast.push("Questions could not be loaded.", "error");
    const questions = ((data || []) as Question[]).map((question) => ({
      ...question,
      question_options: (question.question_options || []).sort((a, b) => a.sort_order - b.sort_order),
    }));
    setRows(questions);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*, question_options(*)")
        .order("sort_order")
        .order("created_at");
      if (cancelled) return;
      if (error) toast.push("Questions could not be loaded.", "error");
      const questions = ((data || []) as Question[]).map((question) => ({
        ...question,
        question_options: (question.question_options || []).sort((a, b) => a.sort_order - b.sort_order),
      }));
      setRows(questions);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, toast]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  }

  function startEdit(question: Question) {
    setEditing(question);
    setForm({
      label: question.label,
      help_text: question.help_text || "",
      placeholder: question.placeholder || "",
      field_type: question.field_type,
      is_required: question.is_required,
      is_active: question.is_active,
      options: (question.question_options || []).map((option) => ({
        id: option.id,
        label: option.label,
        value: option.value,
      })),
    });
    setErrors({});
    setOpen(true);
  }

  function setType(field_type: FieldType) {
    setForm((current) => ({
      ...current,
      field_type,
      options: needsOptions(field_type)
        ? current.options.length
          ? current.options
          : [
              { label: "", value: "" },
              { label: "", value: "" },
            ]
        : [],
    }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.label.trim().length < 1) next.label = "Enter a question.";
    if (needsOptions(form.field_type)) {
      const filled = form.options.filter((option) => option.label.trim());
      if (filled.length < 2) next.options = "Add at least two answer options.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function saveOptions(questionId: string) {
    const options = form.options
      .map((option, index) => ({
        question_id: questionId,
        label: option.label.trim(),
        value: option.value.trim() || slugify(option.label),
        sort_order: index + 1,
        is_active: true,
      }))
      .filter((option) => option.label);
    await supabase.from("question_options").delete().eq("question_id", questionId);
    if (options.length) {
      const { error } = await supabase.from("question_options").insert(options);
      if (error) throw error;
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        help_text: form.help_text.trim() || null,
        placeholder: form.placeholder.trim() || null,
        field_type: form.field_type,
        is_required: form.is_required,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase.from("questions").update(payload).eq("id", editing.id);
        if (error) throw error;
        if (needsOptions(form.field_type)) {
          await saveOptions(editing.id);
        } else {
          await supabase.from("question_options").delete().eq("question_id", editing.id);
        }
      } else {
        const sort_order = (rows[rows.length - 1]?.sort_order || 0) + 10;
        const { data, error } = await supabase
          .from("questions")
          .insert({ ...payload, sort_order })
          .select("id")
          .single();
        if (error) throw error;
        if (needsOptions(form.field_type) && data?.id) {
          await saveOptions(data.id);
        }
      }

      toast.push(editing ? "Question updated." : "Question created.", "success");
      setOpen(false);
      await load();
    } catch (error) {
      toast.push(publicErrorMessage(error, "The question could not be saved."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function reorder(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    const ordered = [...rows];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, moved);
    setRows(ordered);
    const updates = ordered.map((question, sortIndex) =>
      supabase.from("questions").update({ sort_order: (sortIndex + 1) * 10 }).eq("id", question.id),
    );
    const results = await Promise.all(updates);
    if (results.some((result) => result.error)) {
      toast.push("The question order could not be saved.", "error");
      load();
    }
  }

  async function toggleActive(question: Question) {
    const { error } = await supabase
      .from("questions")
      .update({ is_active: !question.is_active })
      .eq("id", question.id);
    if (error) {
      toast.push("The question could not be updated.", "error");
      return;
    }
    setRows((current) =>
      current.map((row) => (row.id === question.id ? { ...row, is_active: !row.is_active } : row)),
    );
  }

  async function remove() {
    if (!pending) return;
    setSaving(true);
    const { error } = await supabase.from("questions").delete().eq("id", pending.id);
    setSaving(false);
    if (error) {
      toast.push("The question could not be deleted.", "error");
      return;
    }
    setPending(null);
    toast.push("Question deleted.", "success");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Questions"
        description="These questions appear on the employee submission form as soon as they are saved."
        actions={<Button onClick={startCreate}>Add question</Button>}
      />

      {loading ? (
        <Spinner label="Loading questions" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No questions yet"
            description="Add questions to collect more than the standard employee fields."
            action={{ label: "Add question", onClick: startCreate }}
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Question</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Required</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{row.label}</p>
                    {row.help_text ? <p className="text-xs text-muted">{row.help_text}</p> : null}
                  </td>
                  <td className="px-4 py-3">{fieldTypeLabel(row.field_type)}</td>
                  <td className="px-4 py-3">{row.is_required ? "Required" : "Optional"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="text-accent hover:underline" disabled={index === 0} onClick={() => reorder(index, -1)}>
                        Up
                      </button>
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        disabled={index === rows.length - 1}
                        onClick={() => reorder(index, 1)}
                      >
                        Down
                      </button>
                      <button type="button" className="text-accent hover:underline" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="text-accent hover:underline" onClick={() => toggleActive(row)}>
                        {row.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" className="text-danger hover:underline" onClick={() => setPending(row)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} title={editing ? "Edit question" : "Add question"} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={save}>
          <div>
            <Label htmlFor="q-label" required>
              Question
            </Label>
            <Input
              id="q-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
            <FieldError message={errors.label} />
          </div>
          <div>
            <Label htmlFor="q-help">Help text</Label>
            <Textarea
              id="q-help"
              value={form.help_text}
              onChange={(event) => setForm((current) => ({ ...current, help_text: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="q-placeholder">Placeholder</Label>
            <Input
              id="q-placeholder"
              value={form.placeholder}
              onChange={(event) => setForm((current) => ({ ...current, placeholder: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="q-type" required>
              Question type
            </Label>
            <Select
              id="q-type"
              value={form.field_type}
              onChange={(event) => setType(event.target.value as FieldType)}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          {needsOptions(form.field_type) ? (
            <div>
              <Label required>Answer options</Label>
              <Hint>These labels appear on the employee form.</Hint>
              <div className="mt-2 space-y-2">
                {form.options.map((option, index) => (
                  <div key={option.id || index} className="flex gap-2">
                    <Input
                      value={option.label}
                      placeholder={`Option ${index + 1}`}
                      onChange={(event) => {
                        const label = event.target.value;
                        setForm((current) => ({
                          ...current,
                          options: current.options.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label, value: slugify(label) } : item,
                          ),
                        }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          options: current.options.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => setForm((current) => ({ ...current, options: [...current.options, { label: "", value: "" }] }))}
              >
                Add option
              </Button>
              <FieldError message={errors.options} />
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_required}
              onChange={(event) => setForm((current) => ({ ...current, is_required: event.target.checked }))}
            />
            Required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
            />
            Active on employee form
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete question?"
        description="This removes the question from the employee form. Previous submissions keep the recorded answers."
        confirmLabel="Delete"
        danger
        busy={saving}
        onClose={() => setPending(null)}
        onConfirm={remove}
      />
    </div>
  );
}

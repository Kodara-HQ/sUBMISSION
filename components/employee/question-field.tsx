"use client";

import { useState } from "react";
import { FieldError, Hint, Input, Label, Select, Textarea } from "@/components/ui/fields";
import type { Question } from "@/lib/types";
import { acceptAttribute, validateUpload } from "@/lib/validations";
import type { PublicSettings } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

type Value = string | string[] | File | null;

export function QuestionField({
  question,
  value,
  error,
  settings,
  onChange,
}: {
  question: Question;
  value: Value;
  error?: string;
  settings: PublicSettings;
  onChange: (value: Value) => void;
}) {
  const [localError, setLocalError] = useState("");
  const id = `question-${question.id}`;
  const errorId = `${id}-error`;
  const shownError = error || localError;
  const options = (question.question_options || [])
    .filter((option) => option.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const accept = acceptAttribute(settings.allowed_file_types);

  return (
    <div>
      <Label htmlFor={id} required={question.is_required}>
        {question.label}
      </Label>
      {question.help_text ? <Hint>{question.help_text}</Hint> : null}

      {question.field_type === "short_text" ? (
        <Input
          id={id}
          value={typeof value === "string" ? value : ""}
          placeholder={question.placeholder || undefined}
          required={question.is_required}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {question.field_type === "long_text" ? (
        <Textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          placeholder={question.placeholder || undefined}
          required={question.is_required}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {question.field_type === "number" ? (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={typeof value === "string" ? value : ""}
          placeholder={question.placeholder || undefined}
          required={question.is_required}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {question.field_type === "date" ? (
        <Input
          id={id}
          type="date"
          value={typeof value === "string" ? value : ""}
          required={question.is_required}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {question.field_type === "dropdown" ? (
        <Select
          id={id}
          value={typeof value === "string" ? value : ""}
          required={question.is_required}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : null}

      {question.field_type === "multiple_choice" ? (
        <fieldset aria-describedby={shownError ? errorId : undefined} className="space-y-2">
          <legend className="sr-only">{question.label}</legend>
          {options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : null}

      {question.field_type === "checkboxes" ? (
        <fieldset aria-describedby={shownError ? errorId : undefined} className="space-y-2">
          <legend className="sr-only">{question.label}</legend>
          {options.map((option) => {
            const selected = Array.isArray(value) ? value : [];
            const checked = selected.includes(option.value);
            return (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={checked}
                  onChange={() => {
                    onChange(
                      checked
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value],
                    );
                  }}
                />
                {option.label}
              </label>
            );
          })}
        </fieldset>
      ) : null}

      {question.field_type === "file" ? (
        <div>
          <input
            id={id}
            type="file"
            accept={accept}
            required={question.is_required && !(value instanceof File)}
            aria-invalid={Boolean(shownError)}
            aria-describedby={shownError ? errorId : undefined}
            className={cn(value instanceof File ? "mb-2" : "", "block w-full text-sm")}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (file) {
                const message = validateUpload(file, settings);
                if (message) {
                  event.target.value = "";
                  setLocalError(message);
                  onChange(null);
                  return;
                }
              }
              setLocalError("");
              onChange(file);
            }}
          />
          {value instanceof File ? (
            <p className="text-sm text-muted">
              {value.name} ({formatBytes(value.size)})
            </p>
          ) : null}
        </div>
      ) : null}

      <FieldError id={errorId} message={shownError} />
    </div>
  );
}

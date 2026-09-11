import type { FieldType } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function publicErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code || "");
    if (code === "23505") return "That record already exists.";
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message || "");
    if (
      message.startsWith("Please ") ||
      message.startsWith("A submission") ||
      message.startsWith("Employee ") ||
      message.startsWith("Unable ") ||
      message.startsWith("A file") ||
      message.startsWith("One of ") ||
      message.startsWith("An administrator") ||
      message.startsWith("Not authenticated") ||
      message.startsWith("Not authorized")
    ) {
      return message;
    }
  }
  return fallback;
}

export function sanitizeFileName(name: string) {
  const base = name.replace(/[^\w.\-() +]+/g, "_").replace(/\s+/g, " ").trim();
  return (base || "upload").slice(0, 120);
}

export function fileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function todayISODate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function fieldTypeLabel(type: FieldType) {
  const labels: Record<FieldType, string> = {
    short_text: "Short text",
    long_text: "Long text",
    multiple_choice: "Multiple choice",
    checkboxes: "Checkboxes",
    dropdown: "Dropdown",
    date: "Date",
    number: "Number",
    file: "File upload",
  };
  return labels[type];
}

export function needsOptions(type: FieldType) {
  return type === "multiple_choice" || type === "checkboxes" || type === "dropdown";
}

export function downloadTextFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

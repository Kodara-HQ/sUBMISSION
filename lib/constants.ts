export const FIELD_TYPES = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "file", label: "File upload" },
] as const;

export const AVAILABLE_FILE_TYPES = [
  { ext: "pdf", label: "PDF", mime: ["application/pdf"] },
  { ext: "doc", label: "DOC", mime: ["application/msword"] },
  { ext: "docx", label: "DOCX", mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { ext: "xls", label: "XLS", mime: ["application/vnd.ms-excel"] },
  { ext: "xlsx", label: "XLSX", mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
  { ext: "jpg", label: "JPG", mime: ["image/jpeg"] },
  { ext: "jpeg", label: "JPEG", mime: ["image/jpeg"] },
  { ext: "png", label: "PNG", mime: ["image/png"] },
] as const;

export const MIME_BY_EXT: Record<string, string[]> = Object.fromEntries(
  AVAILABLE_FILE_TYPES.map((item) => [item.ext, [...item.mime]]),
);

export const ACCEPT_BY_EXT: Record<string, string> = {
  pdf: ".pdf,application/pdf",
  doc: ".doc,application/msword",
  docx: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: ".xls,application/vnd.ms-excel",
  xlsx: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: ".jpg,image/jpeg",
  jpeg: ".jpeg,image/jpeg",
  png: ".png,image/png",
};

export const STORAGE_BUCKET = "submission-files";
export const PAGE_SIZE = 20;
export const MAX_GENERAL_FILES = 5;

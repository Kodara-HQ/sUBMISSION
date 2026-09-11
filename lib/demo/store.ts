import { DEMO_ADMIN_ID, DEMO_USER_ID } from "@/lib/demo/config";

export type DemoRow = Record<string, unknown>;

export type DemoDB = {
  departments: DemoRow[];
  submission_types: DemoRow[];
  employees: DemoRow[];
  admin_users: DemoRow[];
  questions: DemoRow[];
  question_options: DemoRow[];
  app_settings: DemoRow[];
  submissions: DemoRow[];
  submission_answers: DemoRow[];
  submission_files: DemoRow[];
  admin_notes: DemoRow[];
  files: Record<string, { name: string; mime: string; dataUrl: string }>;
};

const STORAGE_KEY = "esp_demo_db_v7";

const D = {
  it: "11111111-1111-4111-8111-111111111111",
  safety: "22222222-2222-4222-8222-222222222222",
  hr: "33333333-3333-4333-8333-333333333333",
  production: "44444444-4444-4444-8444-444444444444",
  store: "55555555-5555-4555-8555-555555555555",
  maintenance: "66666666-6666-4666-8666-666666666666",
  finance: "77777777-7777-4777-8777-777777777777",
};

const T = {
  spotlight: "88888888-8888-4888-8888-888888888880",
  safetyTip: "88888888-8888-4888-8888-888888888885",
};

const Q = {
  inspired: "88888888-8888-4888-8888-888888888881",
  lesson: "88888888-8888-4888-8888-888888888882",
  fiveYears: "88888888-8888-4888-8888-888888888883",
  message: "88888888-8888-4888-8888-888888888884",
  safetyTip: "88888888-8888-4888-8888-888888888886",
};

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function createSeedDb(): DemoDB {
  return {
    departments: [
      { id: D.it, name: "IT", description: "Information technology", is_active: true, created_at: isoDaysAgo(40), updated_at: isoDaysAgo(40) },
      { id: D.safety, name: "Safety", description: "Health, safety, and environment", is_active: true, created_at: isoDaysAgo(40), updated_at: isoDaysAgo(40) },
      { id: D.hr, name: "HR", description: "Human resources", is_active: true, created_at: isoDaysAgo(40), updated_at: isoDaysAgo(40) },
      { id: D.production, name: "Production", description: "Mine production operations", is_active: true, created_at: isoDaysAgo(40), updated_at: isoDaysAgo(40) },
      { id: D.store, name: "Store", description: "Stores and inventory", is_active: true, created_at: isoDaysAgo(40), updated_at: isoDaysAgo(40) },
      { id: D.maintenance, name: "Maintenance", description: "Plant and equipment maintenance", is_active: true, created_at: isoDaysAgo(40), updated_at: isoDaysAgo(40) },
      { id: D.finance, name: "Finance", description: "Finance and accounting", is_active: true, created_at: isoDaysAgo(40), updated_at: isoDaysAgo(40) },
    ],
    submission_types: [
      {
        id: T.spotlight,
        name: "Employee Spotlight",
        description: "Employee spotlight questionnaire",
        is_active: true,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
      {
        id: T.safetyTip,
        name: "Safety Tip",
        description: "Anonymous safety tip submission",
        is_active: true,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
    ],
    employees: [],
    admin_users: [
      {
        id: DEMO_ADMIN_ID,
        user_id: DEMO_USER_ID,
        email: "lamadekue@gmail.com",
        full_name: "Emmanuel Lamadeku",
        role: "super_admin",
        is_active: true,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
    ],
    questions: [
      {
        id: Q.inspired,
        label: "What inspired you to pursue a career in mining?",
        help_text: null,
        placeholder: "Share what first drew you to mining",
        field_type: "long_text",
        is_required: true,
        is_active: true,
        sort_order: 10,
        submission_type_id: T.spotlight,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
      {
        id: Q.lesson,
        label: "What has been your biggest lesson or experience since joining the industry?",
        help_text: null,
        placeholder: "Describe a lesson or experience that has stayed with you",
        field_type: "long_text",
        is_required: true,
        is_active: true,
        sort_order: 20,
        submission_type_id: T.spotlight,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
      {
        id: Q.fiveYears,
        label: "Where do you see yourself professionally in the next five years?",
        help_text: null,
        placeholder: "Tell us about your professional goals",
        field_type: "long_text",
        is_required: true,
        is_active: true,
        sort_order: 30,
        submission_type_id: T.spotlight,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
      {
        id: Q.message,
        label: "What message would you share with young people who aspire to build a career in the mining industry?",
        help_text: null,
        placeholder: "Write a message for the next generation",
        field_type: "long_text",
        is_required: true,
        is_active: true,
        sort_order: 40,
        submission_type_id: T.spotlight,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
      {
        id: Q.safetyTip,
        label: "What is your safety tip?",
        help_text: null,
        placeholder: "Share a safety tip that could help keep others safe",
        field_type: "long_text",
        is_required: true,
        is_active: true,
        sort_order: 10,
        submission_type_id: T.safetyTip,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
    ],
    question_options: [],
    app_settings: [
      {
        id: 1,
        organization_name: "Bloj Company LTD",
        allowed_file_types: ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"],
        max_file_size_mb: 10,
        require_known_employee: false,
        prevent_duplicate_same_day: true,
        notification_email: "lamadekue@gmail.com",
        notification_webhook_url: null,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
    ],
    submissions: [],
    submission_answers: [],
    submission_files: [],
    admin_notes: [],
    files: {},
  };
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function ensureCatalog(db: DemoDB): DemoDB {
  const seed = createSeedDb();
  for (const type of seed.submission_types) {
    const existing = db.submission_types.find((row) => row.id === type.id || row.name === type.name);
    if (!existing) {
      db.submission_types.push(clone(type));
    } else {
      existing.is_active = true;
      existing.name = type.name;
      existing.description = type.description;
    }
  }
  for (const question of seed.questions) {
    const existing = db.questions.find((row) => row.id === question.id || row.label === question.label);
    if (!existing) {
      db.questions.push(clone(question));
    } else {
      existing.is_active = true;
      existing.submission_type_id = question.submission_type_id;
      existing.label = question.label;
      existing.field_type = question.field_type;
      existing.is_required = question.is_required;
      existing.sort_order = question.sort_order;
    }
  }
  const admin = seed.admin_users[0];
  if (admin) {
    db.admin_users = [clone(admin)];
  }
  if (seed.app_settings[0]) {
    const settings = db.app_settings[0] || clone(seed.app_settings[0]);
    settings.organization_name = seed.app_settings[0].organization_name;
    settings.notification_email = seed.app_settings[0].notification_email;
    db.app_settings = [settings];
  }
  return db;
}

/** Pull the shared demo DB used by every browser on this machine/server. */
export async function pullDemoDb(target?: DemoDB): Promise<DemoDB> {
  if (typeof window === "undefined") {
    const seed = createSeedDb();
    if (target) replaceDb(target, seed);
    return target ?? seed;
  }

  const localCopy = readLegacyLocalCopy();

  try {
    const response = await fetch("/api/demo/db", { cache: "no-store" });
    if (!response.ok) throw new Error("demo-db");
    let remote = ensureCatalog((await response.json()) as DemoDB);
    if (
      localCopy &&
      remote.submissions.length === 0 &&
      localCopy.submissions.length > 0
    ) {
      remote = ensureCatalog(localCopy);
      await pushDemoDb(remote);
      clearLegacyLocalCopy();
    }
    if (target) {
      replaceDb(target, remote);
      return target;
    }
    return remote;
  } catch {
    if (localCopy) {
      await pushDemoDb(localCopy).catch(() => undefined);
      clearLegacyLocalCopy();
      if (target) {
        replaceDb(target, localCopy);
        return target;
      }
      return localCopy;
    }
    const seed = createSeedDb();
    if (target) replaceDb(target, seed);
    return target ?? seed;
  }
}

function readLegacyLocalCopy(): DemoDB | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return ensureCatalog(JSON.parse(raw) as DemoDB);
  } catch {
    return null;
  }
}

function clearLegacyLocalCopy() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function pushDemoDb(db: DemoDB): Promise<void> {
  if (typeof window === "undefined") return;
  const payload = ensureCatalog(clone(db));
  await fetch("/api/demo/db", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  clearLegacyLocalCopy();
}

function replaceDb(target: DemoDB, source: DemoDB) {
  const next = ensureCatalog(clone(source));
  target.departments = next.departments;
  target.submission_types = next.submission_types;
  target.employees = next.employees;
  target.admin_users = next.admin_users;
  target.questions = next.questions;
  target.question_options = next.question_options;
  target.app_settings = next.app_settings;
  target.submissions = next.submissions;
  target.submission_answers = next.submission_answers;
  target.submission_files = next.submission_files;
  target.admin_notes = next.admin_notes;
  target.files = next.files;
}

/** @deprecated Prefer pullDemoDb — kept for sync bootstrap only. */
export function loadDemoDb(): DemoDB {
  return createSeedDb();
}

/** @deprecated Prefer pushDemoDb */
export function saveDemoDb(_db: DemoDB) {
  // no-op: shared persistence is async via pushDemoDb
}

export function nowIso() {
  return new Date().toISOString();
}

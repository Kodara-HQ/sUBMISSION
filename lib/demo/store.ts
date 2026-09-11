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

const STORAGE_KEY = "esp_demo_db_v6";

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

const E = {
  alex: "99999999-9999-4999-8999-999999999991",
  jordan: "99999999-9999-4999-8999-999999999992",
  sam: "99999999-9999-4999-8999-999999999993",
};

const S = {
  one: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  two: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  three: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
};

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function dateDaysAgo(days: number) {
  return isoDaysAgo(days).slice(0, 10);
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
    employees: [
      { id: E.alex, full_name: "Alex Rivera", employee_id: "EMP-1001", email: "alex.rivera@example.com", department_id: D.production, is_active: true, created_at: isoDaysAgo(30), updated_at: isoDaysAgo(30) },
      { id: E.jordan, full_name: "Jordan Lee", employee_id: "EMP-1002", email: "jordan.lee@example.com", department_id: D.hr, is_active: true, created_at: isoDaysAgo(30), updated_at: isoDaysAgo(30) },
      { id: E.sam, full_name: "Sam Patel", employee_id: "EMP-1003", email: "sam.patel@example.com", department_id: D.finance, is_active: true, created_at: isoDaysAgo(30), updated_at: isoDaysAgo(30) },
    ],
    admin_users: [
      {
        id: DEMO_ADMIN_ID,
        user_id: DEMO_USER_ID,
        email: "admin@portal.local",
        full_name: "Portal Administrator",
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
        notification_email: "admin@portal.local",
        notification_webhook_url: null,
        created_at: isoDaysAgo(40),
        updated_at: isoDaysAgo(40),
      },
    ],
    submissions: [
      {
        id: S.one,
        employee_id: E.alex,
        employee_full_name: "Alex Rivera",
        employee_identifier: "Production Supervisor",
        department_id: D.production,
        department_name: "Production",
        submission_type_id: T.spotlight,
        submission_type_name: "Employee Spotlight",
        submission_date: dateDaysAgo(2),
        status: "pending",
        created_at: isoDaysAgo(2),
        updated_at: isoDaysAgo(2),
      },
      {
        id: S.two,
        employee_id: E.jordan,
        employee_full_name: "Jordan Lee",
        employee_identifier: "HR Officer",
        department_id: D.hr,
        department_name: "HR",
        submission_type_id: T.spotlight,
        submission_type_name: "Employee Spotlight",
        submission_date: dateDaysAgo(6),
        status: "reviewed",
        created_at: isoDaysAgo(6),
        updated_at: isoDaysAgo(5),
      },
      {
        id: S.three,
        employee_id: E.sam,
        employee_full_name: "Sam Patel",
        employee_identifier: "Accountant",
        department_id: D.finance,
        department_name: "Finance",
        submission_type_id: T.spotlight,
        submission_type_name: "Employee Spotlight",
        submission_date: dateDaysAgo(12),
        status: "pending",
        created_at: isoDaysAgo(12),
        updated_at: isoDaysAgo(12),
      },
    ],
    submission_answers: [
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1", submission_id: S.one, question_id: Q.inspired, question_label: "What inspired you to pursue a career in mining?", field_type: "long_text", answer_text: "I grew up near a mining community and was inspired by the skill and teamwork I saw on site.", answer_json: null, created_at: isoDaysAgo(2), updated_at: isoDaysAgo(2) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2", submission_id: S.one, question_id: Q.lesson, question_label: "What has been your biggest lesson or experience since joining the industry?", field_type: "long_text", answer_text: "Safety is not a slogan. Every decision has to protect the people working beside you.", answer_json: null, created_at: isoDaysAgo(2), updated_at: isoDaysAgo(2) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3", submission_id: S.one, question_id: Q.fiveYears, question_label: "Where do you see yourself professionally in the next five years?", field_type: "long_text", answer_text: "I want to grow into a supervisory role in production and help train new operators.", answer_json: null, created_at: isoDaysAgo(2), updated_at: isoDaysAgo(2) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc4", submission_id: S.one, question_id: Q.message, question_label: "What message would you share with young people who aspire to build a career in the mining industry?", field_type: "long_text", answer_text: "Be curious, respect the process, and never stop learning from people with more experience.", answer_json: null, created_at: isoDaysAgo(2), updated_at: isoDaysAgo(2) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc5", submission_id: S.two, question_id: Q.inspired, question_label: "What inspired you to pursue a career in mining?", field_type: "long_text", answer_text: "I wanted a career where people development makes a real difference to operations.", answer_json: null, created_at: isoDaysAgo(6), updated_at: isoDaysAgo(6) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc6", submission_id: S.two, question_id: Q.lesson, question_label: "What has been your biggest lesson or experience since joining the industry?", field_type: "long_text", answer_text: "Listening first has been the most valuable skill in HR on a mine site.", answer_json: null, created_at: isoDaysAgo(6), updated_at: isoDaysAgo(6) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc7", submission_id: S.two, question_id: Q.fiveYears, question_label: "Where do you see yourself professionally in the next five years?", field_type: "long_text", answer_text: "Leading people programmes that support both safety and career growth.", answer_json: null, created_at: isoDaysAgo(6), updated_at: isoDaysAgo(6) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc8", submission_id: S.two, question_id: Q.message, question_label: "What message would you share with young people who aspire to build a career in the mining industry?", field_type: "long_text", answer_text: "There is space for many professions in mining, not only technical roles. Bring your strengths.", answer_json: null, created_at: isoDaysAgo(6), updated_at: isoDaysAgo(6) },
      { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc9", submission_id: S.three, question_id: Q.inspired, question_label: "What inspired you to pursue a career in mining?", field_type: "long_text", answer_text: "The scale of mining finance and the chance to support a large operation drew me in.", answer_json: null, created_at: isoDaysAgo(12), updated_at: isoDaysAgo(12) },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc10", submission_id: S.three, question_id: Q.lesson, question_label: "What has been your biggest lesson or experience since joining the industry?", field_type: "long_text", answer_text: "Accuracy and deadlines matter because the whole site depends on them.", answer_json: null, created_at: isoDaysAgo(12), updated_at: isoDaysAgo(12) },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc11", submission_id: S.three, question_id: Q.fiveYears, question_label: "Where do you see yourself professionally in the next five years?", field_type: "long_text", answer_text: "I hope to lead a finance workstream and mentor junior accountants.", answer_json: null, created_at: isoDaysAgo(12), updated_at: isoDaysAgo(12) },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc12", submission_id: S.three, question_id: Q.message, question_label: "What message would you share with young people who aspire to build a career in the mining industry?", field_type: "long_text", answer_text: "Build strong fundamentals, stay ethical, and ask questions until you understand the operation.", answer_json: null, created_at: isoDaysAgo(12), updated_at: isoDaysAgo(12) },
    ],
    submission_files: [],
    admin_notes: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
        submission_id: S.two,
        admin_user_id: DEMO_ADMIN_ID,
        note: "Approved for the next Employee Spotlight feature.",
        created_at: isoDaysAgo(5),
        updated_at: isoDaysAgo(5),
      },
    ],
    files: {},
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureCatalog(db: DemoDB): DemoDB {
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
  return db;
}

export function loadDemoDb(): DemoDB {
  if (typeof window === "undefined") return createSeedDb();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedDb();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const db = ensureCatalog(JSON.parse(raw) as DemoDB);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clone(db)));
    return db;
  } catch {
    return createSeedDb();
  }
}

export function saveDemoDb(db: DemoDB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clone(db)));
}

export function nowIso() {
  return new Date().toISOString();
}

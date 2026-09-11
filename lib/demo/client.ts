import {
  clearDemoSessionCookie,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  demoAdmin,
  demoUser,
  hasDemoSessionCookie,
  setDemoSessionCookie,
} from "@/lib/demo/config";
import { createSeedDb, loadDemoDb, nowIso, saveDemoDb, type DemoDB, type DemoRow } from "@/lib/demo/store";

type Filter =
  | { kind: "eq"; field: string; value: unknown }
  | { kind: "in"; field: string; values: unknown[] }
  | { kind: "gte"; field: string; value: string }
  | { kind: "lte"; field: string; value: string }
  | { kind: "or"; expr: string };

type Order = { field: string; ascending: boolean };

function ok<T>(data: T, count?: number) {
  return { data, error: null, count: count ?? (Array.isArray(data) ? data.length : data ? 1 : 0) };
}

function fail(message: string, code?: string) {
  return { data: null, error: { message, code }, count: 0 };
}

function getTable(db: DemoDB, table: string): DemoRow[] {
  const value = db[table as keyof DemoDB];
  return Array.isArray(value) ? value : [];
}

function setTable(db: DemoDB, table: string, rows: DemoRow[]) {
  (db as unknown as Record<string, unknown>)[table] = rows;
}

function matchIlike(value: unknown, needle: string) {
  return String(value ?? "").toLowerCase().includes(needle.toLowerCase());
}

function applyFilters(rows: DemoRow[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.kind === "eq") {
        const left = row[filter.field];
        const right = filter.value;
        if (typeof left === "boolean" || typeof right === "boolean") {
          return Boolean(left) === Boolean(right);
        }
        return left === right;
      }
      if (filter.kind === "in") return filter.values.includes(row[filter.field]);
      if (filter.kind === "gte") return String(row[filter.field] ?? "") >= filter.value;
      if (filter.kind === "lte") return String(row[filter.field] ?? "") <= filter.value;
      return filter.expr.split(",").some((part) => {
        const match = part.trim().match(/^([a-z_]+)\.ilike\.%(.+)%$/i);
        if (!match) return false;
        return matchIlike(row[match[1]], match[2]);
      });
    }),
  );
}

function applyOrder(rows: DemoRow[], orders: Order[]) {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const order of orders) {
      const av = a[order.field];
      const bv = b[order.field];
      if (av === bv) continue;
      const cmp = String(av ?? "") < String(bv ?? "") ? -1 : 1;
      return order.ascending ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

function pickColumns(row: DemoRow, select: string, db: DemoDB) {
  if (select === "*" || !select) return { ...row };
  const embeds = [...select.matchAll(/(\w+)\(([^)]*)\)/g)];
  const fields = select
    .replace(/,?\s*\w+\([^)]*\)/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "*");
  const next: DemoRow = select.includes("*") ? { ...row } : {};
  for (const field of fields) next[field] = row[field];
  for (const [, name, inner] of embeds) {
    if (name === "departments") {
      const related = db.departments.find((item) => item.id === row.department_id);
      next.departments = related
        ? inner === "*"
          ? related
          : Object.fromEntries(inner.split(",").map((key) => [key.trim(), related[key.trim()]]))
        : null;
    } else if (name === "question_options") {
      next.question_options = db.question_options.filter((item) => item.question_id === row.id);
    } else if (name === "admin_users") {
      const related = db.admin_users.find((item) => item.id === row.admin_user_id);
      next.admin_users = related
        ? inner === "*"
          ? related
          : Object.fromEntries(inner.split(",").map((key) => [key.trim(), related[key.trim()]]))
        : null;
    }
  }
  return next;
}

function stats(db: DemoDB) {
  const submissions = db.submissions;
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const byDept = new Map<string, number>();
  const overTime = new Map<string, number>();
  for (const row of submissions) {
    const name = String(row.department_name || "Unknown");
    byDept.set(name, (byDept.get(name) || 0) + 1);
    const day = String(row.created_at).slice(0, 10);
    overTime.set(day, (overTime.get(day) || 0) + 1);
  }
  return {
    total_submissions: submissions.length,
    pending: submissions.filter((row) => row.status === "pending").length,
    reviewed: submissions.filter((row) => row.status === "reviewed").length,
    this_week: submissions.filter((row) => new Date(String(row.created_at)) >= startOfWeek).length,
    this_month: submissions.filter((row) => new Date(String(row.created_at)) >= startOfMonth).length,
    new_submissions: submissions.filter(
      (row) => row.status === "pending" && new Date(String(row.created_at)) >= weekAgo,
    ).length,
    total_employees: db.employees.filter((row) => row.is_active).length,
    by_department: [...byDept.entries()].map(([name, count]) => ({ name, count })),
    over_time: [...overTime.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  };
}

class Query {
  private table: string;
  private db: DemoDB;
  private persist: boolean;
  private action: "select" | "insert" | "update" | "delete" = "select";
  private selectSpec = "*";
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private rangeFrom?: number;
  private rangeTo?: number;
  private limitTo?: number;
  private wantCount = false;
  private wantSingle = false;
  private wantMaybe = false;
  private payload: DemoRow | DemoRow[] | null = null;

  constructor(table: string, db: DemoDB, persist: boolean) {
    this.table = table;
    this.db = db;
    this.persist = persist;
  }

  select(spec = "*", options?: { count?: string }) {
    this.action = this.action === "insert" ? "insert" : "select";
    this.selectSpec = spec;
    this.wantCount = options?.count === "exact";
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ kind: "eq", field, value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters.push({ kind: "in", field, values });
    return this;
  }

  gte(field: string, value: string) {
    this.filters.push({ kind: "gte", field, value });
    return this;
  }

  lte(field: string, value: string) {
    this.filters.push({ kind: "lte", field, value });
    return this;
  }

  or(expr: string) {
    this.filters.push({ kind: "or", expr });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orders.push({ field, ascending: options?.ascending !== false });
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  limit(count: number) {
    this.limitTo = count;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  maybeSingle() {
    this.wantMaybe = true;
    return this;
  }

  insert(row: DemoRow | DemoRow[]) {
    this.action = "insert";
    this.payload = row;
    return this;
  }

  update(row: DemoRow) {
    this.action = "update";
    this.payload = row;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    resolve?: ((value: { data: unknown; error: { message: string; code?: string } | null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.execute()).then(resolve ?? undefined, reject ?? undefined);
  }

  private execute() {
    const rows = getTable(this.db, this.table);
    if (this.action === "select") {
      let result = applyOrder(applyFilters(rows, this.filters), this.orders);
      const count = result.length;
      if (this.rangeFrom != null && this.rangeTo != null) {
        result = result.slice(this.rangeFrom, this.rangeTo + 1);
      }
      if (this.limitTo != null) result = result.slice(0, this.limitTo);
      const mapped = result.map((row) => pickColumns(row, this.selectSpec, this.db));
      if (this.wantSingle || this.wantMaybe) {
        return { data: mapped[0] ?? null, error: null, count: this.wantCount ? count : mapped.length };
      }
      return { data: mapped, error: null, count: this.wantCount ? count : mapped.length };
    }

    if (this.action === "insert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
      const created = incoming.map((row) => ({
        id: row.id || crypto.randomUUID(),
        created_at: nowIso(),
        updated_at: nowIso(),
        ...row,
      }));
      setTable(this.db, this.table, [...rows, ...created]);
      if (this.persist) saveDemoDb(this.db);
      if (this.wantSingle || this.wantMaybe) {
        return ok(pickColumns(created[0], this.selectSpec, this.db));
      }
      return ok(created.map((row) => pickColumns(row, this.selectSpec, this.db)));
    }

    if (this.action === "update") {
      const patch = { ...(this.payload as DemoRow), updated_at: nowIso() };
      const next = rows.map((row) =>
        applyFilters([row], this.filters).length ? { ...row, ...patch } : row,
      );
      setTable(this.db, this.table, next);
      if (this.persist) saveDemoDb(this.db);
      return ok(null);
    }

    const remaining = rows.filter((row) => applyFilters([row], this.filters).length === 0);
    if (this.table === "questions") {
      const removed = new Set(rows.filter((row) => applyFilters([row], this.filters).length).map((row) => row.id));
      this.db.question_options = this.db.question_options.filter((row) => !removed.has(row.question_id));
    }
    if (this.table === "submissions") {
      const removed = new Set(rows.filter((row) => applyFilters([row], this.filters).length).map((row) => row.id));
      this.db.submission_answers = this.db.submission_answers.filter((row) => !removed.has(row.submission_id));
      this.db.submission_files = this.db.submission_files.filter((row) => !removed.has(row.submission_id));
      this.db.admin_notes = this.db.admin_notes.filter((row) => !removed.has(row.submission_id));
    }
    setTable(this.db, this.table, remaining);
    if (this.persist) saveDemoDb(this.db);
    return ok(null);
  }
}

async function rpc(name: string, args: Record<string, unknown>, db: DemoDB, persist: boolean) {
  if (name === "get_public_settings") {
    const row = db.app_settings[0];
    return ok([
      {
        organization_name: row.organization_name,
        allowed_file_types: row.allowed_file_types,
        max_file_size_mb: row.max_file_size_mb,
        require_known_employee: row.require_known_employee,
        prevent_duplicate_same_day: row.prevent_duplicate_same_day,
      },
    ]);
  }
  if (name === "lookup_employee") {
    const identifier = String(args.identifier || "").trim().toLowerCase();
    const row = db.employees.find(
      (item) =>
        item.is_active &&
        (String(item.email || "").toLowerCase() === identifier ||
          String(item.employee_id || "").toLowerCase() === identifier),
    );
    return ok(row ? [row] : []);
  }
  if (name === "get_dashboard_stats") return ok(stats(db));
  if (name === "claim_admin_invite" || name === "bootstrap_admin") return ok(demoAdmin());
  if (name === "submit_form") {
    const payload = (args.payload || {}) as DemoRow;
    const dept = db.departments.find((item) => item.id === payload.department_id);
    const type = db.submission_types.find((item) => item.id === payload.submission_type_id);
    if (!dept || !type) return fail("Please select a valid department and submission type.");
    const identifier = String(payload.employee_identifier || "").trim();
    const fullName = String(payload.employee_full_name || "").trim();
    const isAnonymous = String(type.name).toLowerCase() === "safety tip";
    if (!isAnonymous && identifier.length < 2) return fail("Please enter a valid job title.");
    if (isAnonymous && fullName.length < 2) return fail("Unable to submit the form. Please try again.");
    const settings = db.app_settings[0];
    if (settings.prevent_duplicate_same_day && !isAnonymous) {
      const duplicate = db.submissions.some(
        (row) =>
          String(row.employee_full_name).toLowerCase() === fullName.toLowerCase() &&
          row.submission_type_id === type.id &&
          row.submission_date === payload.submission_date,
      );
      if (duplicate) {
        return fail("A submission of this type has already been received for this employee on this date.");
      }
    }
    const id = crypto.randomUUID();
    const created = nowIso();
    db.submissions.unshift({
      id,
      employee_id: null,
      employee_full_name: isAnonymous ? "Anonymous" : fullName,
      employee_identifier: isAnonymous ? "Safety Tip" : identifier,
      department_id: dept.id,
      department_name: dept.name,
      submission_type_id: type.id,
      submission_type_name: type.name,
      submission_date: payload.submission_date || created.slice(0, 10),
      status: "pending",
      created_at: created,
      updated_at: created,
    });
    const answers = Array.isArray(payload.answers) ? (payload.answers as DemoRow[]) : [];
    for (const question of db.questions.filter(
      (item) =>
        item.is_active &&
        (!item.submission_type_id || item.submission_type_id === type.id),
    )) {
      const answer = answers.find((item) => item.question_id === question.id);
      const text = answer?.answer_text ?? null;
      const json = answer?.answer_json ?? null;
      if (question.is_required && question.field_type !== "file") {
        if (question.field_type === "checkboxes") {
          if (!Array.isArray(json) || json.length === 0) {
            return fail("Please complete all required questions.");
          }
        } else if (!text || String(text).trim().length === 0) {
          return fail("Please complete all required questions.");
        }
      }
      db.submission_answers.push({
        id: crypto.randomUUID(),
        submission_id: id,
        question_id: question.id,
        question_label: question.label,
        field_type: question.field_type,
        answer_text: text,
        answer_json: json,
        created_at: created,
        updated_at: created,
      });
    }
    if (persist) saveDemoDb(db);
    return ok(id);
  }
  if (name === "attach_submission_files") {
    const files = Array.isArray(args.p_files) ? (args.p_files as DemoRow[]) : [];
    for (const file of files) {
      db.submission_files.push({
        id: crypto.randomUUID(),
        submission_id: args.p_submission_id,
        question_id: file.question_id || null,
        file_name: file.file_name,
        file_path: file.file_path,
        file_size: file.file_size,
        mime_type: file.mime_type,
        created_at: nowIso(),
      });
    }
    if (persist) saveDemoDb(db);
    return ok(null);
  }
  return fail("Unknown procedure");
}

export function createDemoClient(options?: { cookieHeader?: string; persist?: boolean }) {
  const persist = options?.persist ?? typeof window !== "undefined";
  const db = persist ? loadDemoDb() : createSeedDb();
  const cookieHeader = options?.cookieHeader;

  return {
    from(table: string) {
      return new Query(table, db, persist);
    },
    rpc(name: string, args: Record<string, unknown> = {}) {
      return rpc(name, args, db, persist);
    },
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          return fail("Invalid email or password.");
        }
        if (typeof document !== "undefined") setDemoSessionCookie();
        return ok({ user: demoUser(), session: { access_token: "demo" } });
      },
      async signOut() {
        if (typeof document !== "undefined") clearDemoSessionCookie();
        return ok(null);
      },
      async getUser() {
        const authed = hasDemoSessionCookie(cookieHeader);
        return ok({ user: authed ? demoUser() : null });
      },
      async updateUser() {
        return ok({ user: demoUser() });
      },
      async exchangeCodeForSession() {
        return fail("Demo mode does not use email links.");
      },
    },
    storage: {
      from() {
        return {
          async upload(path: string, file: File) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error("read"));
              reader.readAsDataURL(file);
            });
            db.files[path] = { name: file.name, mime: file.type, dataUrl };
            if (persist) saveDemoDb(db);
            return ok({ path });
          },
          async createSignedUrl(path: string) {
            const file = db.files[path];
            if (!file) return fail("File not found.");
            return ok({ signedUrl: file.dataUrl });
          },
          async remove(paths: string[]) {
            for (const path of paths) delete db.files[path];
            if (persist) saveDemoDb(db);
            return ok(null);
          },
        };
      },
    },
  };
}

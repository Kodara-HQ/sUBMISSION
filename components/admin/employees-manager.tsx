"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Input, Label, Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Department, Employee } from "@/lib/types";
import { formatDate, publicErrorMessage } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks";
import { isEmail } from "@/lib/validations";

type FormState = {
  full_name: string;
  employee_id: string;
  email: string;
  department_id: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  full_name: "",
  employee_id: "",
  email: "",
  department_id: "",
  is_active: true,
};

export function EmployeesManager() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [rows, setRows] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [departmentId, setDepartmentId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Employee | null>(null);

  useEffect(() => {
    supabase
      .from("departments")
      .select("*")
      .order("name")
      .then(({ data }: { data: Department[] | null }) => setDepartments((data || []) as Department[]));
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let query = supabase
        .from("employees")
        .select("*, departments(id,name)")
        .order("full_name");
      if (!showInactive) query = query.eq("is_active", true);
      if (departmentId) query = query.eq("department_id", departmentId);
      const q = debouncedSearch.replace(/[%(),]/g, " ").trim();
      if (q) {
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,employee_id.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (cancelled) return;
      if (error) toast.push("Employees could not be loaded.", "error");
      setRows((data || []) as Employee[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, debouncedSearch, departmentId, showInactive, toast]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  }

  function startEdit(employee: Employee) {
    setEditing(employee);
    setForm({
      full_name: employee.full_name,
      employee_id: employee.employee_id || "",
      email: employee.email || "",
      department_id: employee.department_id || "",
      is_active: employee.is_active,
    });
    setErrors({});
    setOpen(true);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.full_name.trim().length < 2) next.full_name = "Enter the employee’s full name.";
    if (!form.employee_id.trim() && !form.email.trim()) {
      next.identifier = "Enter an employee ID, an email, or both.";
    }
    if (form.email.trim() && !isEmail(form.email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      employee_id: form.employee_id.trim() || null,
      email: form.email.trim() || null,
      department_id: form.department_id || null,
      is_active: form.is_active,
    };
    const result = editing
      ? await supabase.from("employees").update(payload).eq("id", editing.id)
      : await supabase.from("employees").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.push(publicErrorMessage(result.error, "The employee could not be saved."), "error");
      return;
    }
    toast.push(editing ? "Employee updated." : "Employee added.", "success");
    setOpen(false);
    const { data } = await supabase.from("employees").select("*, departments(id,name)").order("full_name");
    setRows((data || []) as Employee[]);
  }

  async function deactivate() {
    if (!pending) return;
    setSaving(true);
    const { error } = await supabase.from("employees").update({ is_active: false }).eq("id", pending.id);
    setSaving(false);
    if (error) {
      toast.push("The employee could not be deactivated.", "error");
      return;
    }
    setRows((current) =>
      current.map((row) => (row.id === pending.id ? { ...row, is_active: false } : row)),
    );
    setPending(null);
    toast.push("Employee deactivated.", "success");
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Maintain the employee directory used for matching submissions."
        actions={<Button onClick={startCreate}>Add employee</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Search name, email, or employee ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search employees"
          />
          <Select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Show deactivated
          </label>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Loading employees" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No employees" description="Add employees so submissions can be matched to directory records." />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Employee ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-navy">{row.full_name}</td>
                  <td className="px-4 py-3">{row.employee_id || "—"}</td>
                  <td className="px-4 py-3">{row.email || "—"}</td>
                  <td className="px-4 py-3">{row.departments?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/admin/employees/${row.id}`} className="text-accent hover:underline">
                        History
                      </Link>
                      <button type="button" className="text-accent hover:underline" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      {row.is_active ? (
                        <button type="button" className="text-danger hover:underline" onClick={() => setPending(row)}>
                          Deactivate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-muted">Added {rows[0] ? formatDate(rows[0].created_at) : ""}</p>
        </Card>
      )}

      <Modal open={open} title={editing ? "Edit employee" : "Add employee"} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={save}>
          <div>
            <Label htmlFor="full_name" required>
              Full name
            </Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
            <FieldError message={errors.full_name} />
          </div>
          <div>
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input
              id="employee_id"
              value={form.employee_id}
              onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <FieldError message={errors.email} />
            <FieldError message={errors.identifier} />
          </div>
          <div>
            <Label htmlFor="department_id">Department</Label>
            <Select
              id="department_id"
              value={form.department_id}
              onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
            >
              <option value="">Unassigned</option>
              {departments
                .filter((department) => department.is_active || department.id === form.department_id)
                .map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
            />
            Active
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
        title="Deactivate employee?"
        description="Deactivated employees cannot be matched to new submissions. Existing submissions are kept."
        confirmLabel="Deactivate"
        danger
        busy={saving}
        onClose={() => setPending(null)}
        onConfirm={deactivate}
      />
    </div>
  );
}

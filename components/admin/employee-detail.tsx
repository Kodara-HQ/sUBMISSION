"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Input, Label, Select } from "@/components/ui/fields";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Department, Employee, Submission } from "@/lib/types";
import { formatDate, publicErrorMessage } from "@/lib/utils";
import { isEmail } from "@/lib/validations";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function EmployeeDetail({ id }: { id: string }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validId = UUID_RE.test(id);

  const load = useCallback(async () => {
    const [empRes, deptRes, subRes] = await Promise.all([
      supabase.from("employees").select("*, departments(id,name)").eq("id", id).maybeSingle(),
      supabase.from("departments").select("*").order("name"),
      supabase
        .from("submissions")
        .select("*")
        .eq("employee_id", id)
        .order("created_at", { ascending: false }),
    ]);
    const row = (empRes.data as Employee | null) ?? null;
    setEmployee(row);
    setDepartments((deptRes.data || []) as Department[]);
    setSubmissions((subRes.data || []) as Submission[]);
    if (row) {
      setFullName(row.full_name);
      setEmployeeId(row.employee_id || "");
      setEmail(row.email || "");
      setDepartmentId(row.department_id || "");
      setActive(row.is_active);
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      const [empRes, deptRes, subRes] = await Promise.all([
        supabase.from("employees").select("*, departments(id,name)").eq("id", id).maybeSingle(),
        supabase.from("departments").select("*").order("name"),
        supabase
          .from("submissions")
          .select("*")
          .eq("employee_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const row = (empRes.data as Employee | null) ?? null;
      setEmployee(row);
      setDepartments((deptRes.data || []) as Department[]);
      setSubmissions((subRes.data || []) as Submission[]);
      if (row) {
        setFullName(row.full_name);
        setEmployeeId(row.employee_id || "");
        setEmail(row.email || "");
        setDepartmentId(row.department_id || "");
        setActive(row.is_active);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase, validId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.full_name = "Enter the employee’s full name.";
    if (!employeeId.trim() && !email.trim()) next.identifier = "Enter an employee ID, an email, or both.";
    if (email.trim() && !isEmail(email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .update({
        full_name: fullName.trim(),
        employee_id: employeeId.trim() || null,
        email: email.trim() || null,
        department_id: departmentId || null,
        is_active: active,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.push(publicErrorMessage(error, "The employee could not be updated."), "error");
      return;
    }
    toast.push("Employee updated.", "success");
    load();
  }

  if (!validId) {
    return (
      <div>
        <PageHeader title="Employee" />
        <Alert tone="error">This employee was not found.</Alert>
        <Link href="/admin/employees" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to employees
        </Link>
      </div>
    );
  }

  if (loading) return <Spinner label="Loading employee" />;

  if (!employee) {
    return (
      <div>
        <PageHeader title="Employee" />
        <Alert tone="error">This employee was not found.</Alert>
        <Link href="/admin/employees" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to employees
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={employee.full_name}
        description="Edit directory details and review this employee’s submission history."
        actions={
          <Link
            href="/admin/employees"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            Back
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Employee information" />
          <CardBody>
            <form className="space-y-4" onSubmit={save}>
              <div>
                <Label htmlFor="full_name" required>
                  Full name
                </Label>
                <Input id="full_name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
                <FieldError message={errors.full_name} />
              </div>
              <div>
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input id="employee_id" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <FieldError message={errors.email} />
                <FieldError message={errors.identifier} />
              </div>
              <div>
                <Label htmlFor="department_id">Department</Label>
                <Select id="department_id" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                  <option value="">Unassigned</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Active
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Submission history" />
          {submissions.length === 0 ? (
            <EmptyState title="No submissions" description="Submissions matched to this employee will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3">{row.submission_type_name}</td>
                      <td className="px-4 py-3">{formatDate(row.submission_date)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={row.status === "reviewed" ? "success" : "warning"}>
                          {row.status === "reviewed" ? "Reviewed" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/submissions/${row.id}`} className="text-accent hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

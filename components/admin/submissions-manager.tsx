"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/fields";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { PAGE_SIZE, STORAGE_BUCKET } from "@/lib/constants";
import { exportSubmissionsCsv } from "@/lib/export";
import { createClient } from "@/lib/supabase/client";
import type {
  Department,
  Question,
  Submission,
  SubmissionAnswer,
  SubmissionFile,
  SubmissionStatus,
  SubmissionType,
} from "@/lib/types";
import { formatDate, publicErrorMessage, useDebouncedValue } from "@/lib/utils";

function sanitizeSearch(value: string) {
  return value.replace(/[%(),]/g, " ").replace(/\s+/g, " ").trim();
}

export function SubmissionsManager() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [departmentId, setDepartmentId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Submission[]>([]);
  const [count, setCount] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [types, setTypes] = useState<SubmissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Submission | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filterKey = `${debouncedSearch}|${departmentId}|${typeId}|${status}|${fromDate}|${toDate}`;
  const [pageFilterKey, setPageFilterKey] = useState(filterKey);
  if (pageFilterKey !== filterKey) {
    setPageFilterKey(filterKey);
    setPage(0);
  }

  useEffect(() => {
    supabase
      .from("departments")
      .select("*")
      .order("name")
      .then(({ data }: { data: Department[] | null }) => setDepartments((data || []) as Department[]));
    supabase
      .from("submission_types")
      .select("*")
      .order("name")
      .then(({ data }: { data: SubmissionType[] | null }) => setTypes((data || []) as SubmissionType[]));
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let query = supabase
        .from("submissions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const q = sanitizeSearch(debouncedSearch);
      if (q) {
        query = query.or(
          `employee_full_name.ilike.%${q}%,employee_identifier.ilike.%${q}%,department_name.ilike.%${q}%,submission_type_name.ilike.%${q}%`,
        );
      }
      if (departmentId) query = query.eq("department_id", departmentId);
      if (typeId) query = query.eq("submission_type_id", typeId);
      if (status) query = query.eq("status", status);
      if (fromDate) query = query.gte("submission_date", fromDate);
      if (toDate) query = query.lte("submission_date", toDate);

      const { data, count: total, error } = await query;
      if (cancelled) return;
      if (error) {
        toast.push("Submissions could not be loaded.", "error");
        setRows([]);
      } else {
        setRows((data || []) as Submission[]);
        setCount(total || 0);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, debouncedSearch, departmentId, typeId, status, fromDate, toDate, page, toast]);

  async function setStatusFor(submission: Submission, next: SubmissionStatus) {
    const { error } = await supabase.from("submissions").update({ status: next }).eq("id", submission.id);
    if (error) {
      toast.push("The status could not be updated.", "error");
      return;
    }
    setRows((current) => current.map((row) => (row.id === submission.id ? { ...row, status: next } : row)));
    toast.push(`Marked as ${next === "reviewed" ? "reviewed" : "pending"}.`, "success");
  }

  async function removeSubmission() {
    if (!pendingDelete) return;
    setDeleting(true);
    const { data: files } = await supabase
      .from("submission_files")
      .select("file_path")
      .eq("submission_id", pendingDelete.id);
    const paths = ((files || []) as Pick<SubmissionFile, "file_path">[]).map((file) => file.file_path);
    if (paths.length) {
      await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    }
    const { error } = await supabase.from("submissions").delete().eq("id", pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.push(publicErrorMessage(error, "The submission could not be deleted."), "error");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== pendingDelete.id));
    setCount((current) => Math.max(0, current - 1));
    setPendingDelete(null);
    toast.push("Submission deleted.", "success");
  }

  async function exportRows() {
    setExporting(true);
    try {
      let query = supabase.from("submissions").select("*").order("created_at", { ascending: false }).limit(2000);
      const q = sanitizeSearch(debouncedSearch);
      if (q) {
        query = query.or(
          `employee_full_name.ilike.%${q}%,employee_identifier.ilike.%${q}%,department_name.ilike.%${q}%,submission_type_name.ilike.%${q}%`,
        );
      }
      if (departmentId) query = query.eq("department_id", departmentId);
      if (typeId) query = query.eq("submission_type_id", typeId);
      if (status) query = query.eq("status", status);
      if (fromDate) query = query.gte("submission_date", fromDate);
      if (toDate) query = query.lte("submission_date", toDate);

      const { data, error } = await query;
      if (error) throw error;
      const submissions = (data || []) as Submission[];
      const ids = submissions.map((item) => item.id);
      const [{ data: answers }, { data: files }, { data: questions }] = await Promise.all([
        ids.length
          ? supabase.from("submission_answers").select("*").in("submission_id", ids)
          : Promise.resolve({ data: [] }),
        ids.length
          ? supabase.from("submission_files").select("*").in("submission_id", ids)
          : Promise.resolve({ data: [] }),
        supabase.from("questions").select("id,label").order("sort_order"),
      ]);

      const answersBySubmission: Record<string, SubmissionAnswer[]> = {};
      const filesBySubmission: Record<string, SubmissionFile[]> = {};
      for (const answer of (answers || []) as SubmissionAnswer[]) {
        answersBySubmission[answer.submission_id] = answersBySubmission[answer.submission_id] || [];
        answersBySubmission[answer.submission_id].push(answer);
      }
      for (const file of (files || []) as SubmissionFile[]) {
        filesBySubmission[file.submission_id] = filesBySubmission[file.submission_id] || [];
        filesBySubmission[file.submission_id].push(file);
      }
      exportSubmissionsCsv(
        submissions,
        answersBySubmission,
        filesBySubmission,
        (questions || []) as Pick<Question, "id" | "label">[],
      );
      toast.push("Export downloaded.", "success");
    } catch {
      toast.push("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Submissions"
        description="Search, filter, review, and export employee submissions."
        actions={
          <Button variant="outline" onClick={exportRows} disabled={exporting}>
            {exporting ? "Exporting…" : "Export CSV / Excel"}
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            placeholder="Search name, job title, department, type"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search submissions"
            className="xl:col-span-2"
          />
          <Select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          <Select value={typeId} onChange={(event) => setTypeId(event.target.value)} aria-label="Filter by submission type">
            <option value="">All types</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
          </Select>
          <div className="grid grid-cols-2 gap-2 xl:col-span-1 md:col-span-2 xl:col-span-6 xl:grid-cols-2">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date" />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date" />
          </div>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Loading submissions" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No submissions found" description="Try adjusting your search or filters." />
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Card>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee name</th>
                    <th className="px-4 py-3 font-medium">Job title</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Submission type</th>
                    <th className="px-4 py-3 font-medium">Submission date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-navy">{row.employee_full_name}</td>
                      <td className="px-4 py-3">{row.employee_identifier}</td>
                      <td className="px-4 py-3">{row.department_name}</td>
                      <td className="px-4 py-3">{row.submission_type_name}</td>
                      <td className="px-4 py-3">{formatDate(row.submission_date)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={row.status === "reviewed" ? "success" : "warning"}>
                          {row.status === "reviewed" ? "Reviewed" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link className="text-accent hover:underline" href={`/admin/submissions/${row.id}`}>
                            View
                          </Link>
                          {row.status === "pending" ? (
                            <button className="text-accent hover:underline" onClick={() => setStatusFor(row, "reviewed")}>
                              Mark reviewed
                            </button>
                          ) : (
                            <button className="text-accent hover:underline" onClick={() => setStatusFor(row, "pending")}>
                              Mark pending
                            </button>
                          )}
                          <button className="text-danger hover:underline" onClick={() => setPendingDelete(row)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Card key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy">{row.employee_full_name}</p>
                    <p className="text-sm text-muted">{row.employee_identifier}</p>
                  </div>
                  <Badge tone={row.status === "reviewed" ? "success" : "warning"}>
                    {row.status === "reviewed" ? "Reviewed" : "Pending"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm">
                  {row.department_name} · {row.submission_type_name}
                </p>
                <p className="text-sm text-muted">{formatDate(row.submission_date)}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link className="text-accent" href={`/admin/submissions/${row.id}`}>
                    View
                  </Link>
                  <button className="text-accent" onClick={() => setStatusFor(row, row.status === "pending" ? "reviewed" : "pending")}>
                    {row.status === "pending" ? "Mark reviewed" : "Mark pending"}
                  </button>
                  <button className="text-danger" onClick={() => setPendingDelete(row)}>
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <p>
              {count} result{count === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete submission?"
        description="This permanently removes the submission, answers, notes, and uploaded files."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={removeSubmission}
      />
    </div>
  );
}

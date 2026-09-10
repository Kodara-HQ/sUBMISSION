"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Input, Label, Textarea } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Department } from "@/lib/types";
import { publicErrorMessage } from "@/lib/utils";

export function DepartmentsManager() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Department | null>(null);

  async function load() {
    const { data, error: loadError } = await supabase.from("departments").select("*").order("name");
    if (loadError) toast.push("Departments could not be loaded.", "error");
    setRows((data || []) as Department[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: loadError } = await supabase.from("departments").select("*").order("name");
      if (cancelled) return;
      if (loadError) toast.push("Departments could not be loaded.", "error");
      setRows((data || []) as Department[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, toast]);

  function startCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setError("");
    setOpen(true);
  }

  function startEdit(department: Department) {
    setEditing(department);
    setName(department.name);
    setDescription(department.description || "");
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 1) {
      setError("Enter a department name.");
      return;
    }
    setSaving(true);
    const payload = { name: name.trim(), description: description.trim() || null };
    const result = editing
      ? await supabase.from("departments").update(payload).eq("id", editing.id)
      : await supabase.from("departments").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.push(publicErrorMessage(result.error, "The department could not be saved."), "error");
      return;
    }
    if (editing) {
      await supabase.from("submissions").update({ department_name: payload.name }).eq("department_id", editing.id);
    }
    toast.push(editing ? "Department updated." : "Department created.", "success");
    setOpen(false);
    load();
  }

  async function toggleActive() {
    if (!pending) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from("departments")
      .update({ is_active: !pending.is_active })
      .eq("id", pending.id);
    setSaving(false);
    if (updateError) {
      toast.push("The department could not be updated.", "error");
      return;
    }
    setPending(null);
    toast.push(pending.is_active ? "Department deactivated." : "Department activated.", "success");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Create, rename, and deactivate departments used on the employee form."
        actions={<Button onClick={startCreate}>Add department</Button>}
      />

      {loading ? (
        <Spinner label="Loading departments" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No departments" description="Add at least one department before collecting submissions." />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-navy">{row.name}</td>
                  <td className="px-4 py-3 text-muted">{row.description || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="text-accent hover:underline" onClick={() => startEdit(row)}>
                        Rename
                      </button>
                      <button type="button" className="text-accent hover:underline" onClick={() => setPending(row)}>
                        {row.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} title={editing ? "Rename department" : "Add department"} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={save}>
          <div>
            <Label htmlFor="dept-name" required>
              Name
            </Label>
            <Input id="dept-name" value={name} onChange={(event) => setName(event.target.value)} />
            <FieldError message={error} />
          </div>
          <div>
            <Label htmlFor="dept-description">Description</Label>
            <Textarea
              id="dept-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
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
        title={pending?.is_active ? "Deactivate department?" : "Activate department?"}
        description={
          pending?.is_active
            ? "Inactive departments no longer appear on the employee form. Existing submissions keep their recorded department."
            : "This department will appear on the employee form again."
        }
        confirmLabel={pending?.is_active ? "Deactivate" : "Activate"}
        danger={Boolean(pending?.is_active)}
        busy={saving}
        onClose={() => setPending(null)}
        onConfirm={toggleActive}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, Hint, Input, Label } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { AVAILABLE_FILE_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { AdminRole, AdminUser, AppSettings, SubmissionType } from "@/lib/types";
import { publicErrorMessage } from "@/lib/utils";
import { isEmail } from "@/lib/validations";

export function SettingsManager({ role }: { role: AdminRole }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const isSuper = role === "super_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [types, setTypes] = useState<SubmissionType[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [orgName, setOrgName] = useState("");
  const [maxSize, setMaxSize] = useState(10);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [requireKnown, setRequireKnown] = useState(false);
  const [preventDup, setPreventDup] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [editingType, setEditingType] = useState<SubmissionType | null>(null);
  const [typeError, setTypeError] = useState("");
  const [pendingType, setPendingType] = useState<SubmissionType | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("admin");
  const [adminError, setAdminError] = useState("");
  const [pendingAdmin, setPendingAdmin] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  async function load() {
    const [settingsRes, typesRes, adminRes] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("submission_types").select("*").order("name"),
      isSuper ? supabase.from("admin_users").select("*").order("created_at") : Promise.resolve({ data: [] }),
    ]);
    const row = (settingsRes.data as AppSettings | null) ?? null;
    setSettings(row);
    if (row) {
      setOrgName(row.organization_name);
      setMaxSize(row.max_file_size_mb);
      setAllowed(row.allowed_file_types || []);
      setRequireKnown(row.require_known_employee);
      setPreventDup(row.prevent_duplicate_same_day);
      setNotificationEmail(row.notification_email || "");
      setWebhookUrl(row.notification_webhook_url || "");
    }
    setTypes((typesRes.data || []) as SubmissionType[]);
    setAdmins((adminRes.data || []) as AdminUser[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [settingsRes, typesRes, adminRes] = await Promise.all([
        supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("submission_types").select("*").order("name"),
        isSuper ? supabase.from("admin_users").select("*").order("created_at") : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      const row = (settingsRes.data as AppSettings | null) ?? null;
      setSettings(row);
      if (row) {
        setOrgName(row.organization_name);
        setMaxSize(row.max_file_size_mb);
        setAllowed(row.allowed_file_types || []);
        setRequireKnown(row.require_known_employee);
        setPreventDup(row.prevent_duplicate_same_day);
        setNotificationEmail(row.notification_email || "");
        setWebhookUrl(row.notification_webhook_url || "");
      }
      setTypes((typesRes.data || []) as SubmissionType[]);
      setAdmins((adminRes.data || []) as AdminUser[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuper, supabase]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (orgName.trim().length < 2) {
      toast.push("Enter an organization name.", "error");
      return;
    }
    if (allowed.length === 0) {
      toast.push("Select at least one allowed file type.", "error");
      return;
    }
    if (notificationEmail && !isEmail(notificationEmail)) {
      toast.push("Enter a valid notification email or leave it blank.", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        organization_name: orgName.trim(),
        max_file_size_mb: maxSize,
        allowed_file_types: allowed,
        require_known_employee: requireKnown,
        prevent_duplicate_same_day: preventDup,
        notification_email: notificationEmail.trim() || null,
        notification_webhook_url: webhookUrl.trim() || null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.push(publicErrorMessage(error, "Settings could not be saved."), "error");
      return;
    }
    toast.push("Settings saved.", "success");
  }

  function startType(type?: SubmissionType) {
    setEditingType(type || null);
    setTypeName(type?.name || "");
    setTypeDescription(type?.description || "");
    setTypeError("");
    setTypeOpen(true);
  }

  async function saveType(event: React.FormEvent) {
    event.preventDefault();
    if (typeName.trim().length < 1) {
      setTypeError("Enter a submission type name.");
      return;
    }
    setSaving(true);
    const payload = { name: typeName.trim(), description: typeDescription.trim() || null };
    const result = editingType
      ? await supabase.from("submission_types").update(payload).eq("id", editingType.id)
      : await supabase.from("submission_types").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.push(publicErrorMessage(result.error, "The submission type could not be saved."), "error");
      return;
    }
    if (editingType) {
      await supabase
        .from("submissions")
        .update({ submission_type_name: payload.name })
        .eq("submission_type_id", editingType.id);
    }
    setTypeOpen(false);
    toast.push(editingType ? "Submission type updated." : "Submission type created.", "success");
    load();
  }

  async function toggleType() {
    if (!pendingType) return;
    setSaving(true);
    const { error } = await supabase
      .from("submission_types")
      .update({ is_active: !pendingType.is_active })
      .eq("id", pendingType.id);
    setSaving(false);
    if (error) {
      toast.push("The submission type could not be updated.", "error");
      return;
    }
    setPendingType(null);
    load();
  }

  async function saveAdmin(event: React.FormEvent) {
    event.preventDefault();
    if (!isSuper) return;
    if (adminName.trim().length < 2) {
      setAdminError("Enter the administrator’s name.");
      return;
    }
    if (!isEmail(adminEmail)) {
      setAdminError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("admin_users").insert({
      email: adminEmail.trim().toLowerCase(),
      full_name: adminName.trim(),
      role: adminRole,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.push(publicErrorMessage(error, "The administrator could not be added."), "error");
      return;
    }
    setAdminOpen(false);
    setAdminName("");
    setAdminEmail("");
    toast.push("Administrator added. Create their Auth user in Supabase before they can sign in.", "success");
    load();
  }

  async function deactivateAdmin() {
    if (!pendingAdmin || !isSuper) return;
    setSaving(true);
    const { error } = await supabase.from("admin_users").update({ is_active: false }).eq("id", pendingAdmin.id);
    setSaving(false);
    if (error) {
      toast.push("The administrator could not be updated.", "error");
      return;
    }
    setPendingAdmin(null);
    toast.push("Administrator deactivated.", "success");
    load();
  }

  if (loading) return <Spinner label="Loading settings" />;

  if (!settings) {
    return <p className="text-sm text-danger">Settings could not be loaded.</p>;
  }

  return (
    <div>
      <PageHeader title="Settings" description="Organization, file upload, notification, and access settings." />

      <form className="space-y-6" onSubmit={saveSettings}>
        <Card>
          <CardHeader title="Organization" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="org" required>
                Organization name
              </Label>
              <Input id="org" value={orgName} onChange={(event) => setOrgName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="max-size" required>
                Maximum file size (MB)
              </Label>
              <Input
                id="max-size"
                type="number"
                min={1}
                max={50}
                value={maxSize}
                onChange={(event) => setMaxSize(Number(event.target.value) || 10)}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-navy">Allowed file types</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AVAILABLE_FILE_TYPES.map((item) => (
                  <label key={item.ext} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allowed.includes(item.ext)}
                      onChange={(event) => {
                        setAllowed((current) =>
                          event.target.checked
                            ? [...current, item.ext]
                            : current.filter((ext) => ext !== item.ext),
                        );
                      }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={requireKnown} onChange={(event) => setRequireKnown(event.target.checked)} />
              Require a matching employee directory record
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={preventDup} onChange={(event) => setPreventDup(event.target.checked)} />
              Prevent duplicate submissions of the same type on the same date
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Notifications"
            description="New submissions are written to notification_queue so email or chat alerts can be added later."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="notify-email">Administrator notification email</Label>
              <Input
                id="notify-email"
                type="email"
                value={notificationEmail}
                onChange={(event) => setNotificationEmail(event.target.value)}
              />
              <Hint>Stored for a future email integration. This app does not send email by itself.</Hint>
            </div>
            <div>
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://"
              />
              <Hint>
                Point a Supabase Database Webhook on notification_queue inserts to this URL, or to an email provider.
              </Hint>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>

      <Card className="mt-6">
        <CardHeader
          title="Submission types"
          action={
            <Button size="sm" onClick={() => startType()}>
              Add type
            </Button>
          }
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy">{type.name}</p>
                    {type.description ? <p className="text-xs text-muted">{type.description}</p> : null}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={type.is_active ? "success" : "neutral"}>{type.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button type="button" className="text-accent hover:underline" onClick={() => startType(type)}>
                        Edit
                      </button>
                      <button type="button" className="text-accent hover:underline" onClick={() => setPendingType(type)}>
                        {type.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Your password" description="Change the password for the signed-in administrator account." />
        <CardBody>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (password.length < 8) {
                toast.push("Use a password with at least 8 characters.", "error");
                return;
              }
              if (password !== password2) {
                toast.push("Passwords do not match.", "error");
                return;
              }
              const { error } = await supabase.auth.updateUser({ password });
              if (error) {
                toast.push("The password could not be updated.", "error");
                return;
              }
              setPassword("");
              setPassword2("");
              toast.push("Password updated.", "success");
            }}
          >
            <div>
              <Label htmlFor="pw1" required>
                New password
              </Label>
              <Input
                id="pw1"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pw2" required>
                Confirm password
              </Label>
              <Input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(event) => setPassword2(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Update password</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {isSuper ? (
        <Card className="mt-6">
          <CardHeader
            title="Administrators"
            description="Create the matching Auth user in Supabase before the person can sign in."
            action={
              <Button size="sm" onClick={() => setAdminOpen(true)}>
                Add administrator
              </Button>
            }
          />
          <CardBody className="overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium text-navy">{admin.full_name}</td>
                    <td className="px-5 py-3">{admin.email}</td>
                    <td className="px-5 py-3">{admin.role === "super_admin" ? "Super admin" : "Admin"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={admin.is_active ? "success" : "neutral"}>
                        {admin.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {admin.is_active ? (
                        <button type="button" className="text-danger hover:underline" onClick={() => setPendingAdmin(admin)}>
                          Deactivate
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}

      <Modal open={typeOpen} title={editingType ? "Edit submission type" : "Add submission type"} onClose={() => setTypeOpen(false)}>
        <form className="space-y-4" onSubmit={saveType}>
          <div>
            <Label htmlFor="type-name" required>
              Name
            </Label>
            <Input id="type-name" value={typeName} onChange={(event) => setTypeName(event.target.value)} />
            <FieldError message={typeError} />
          </div>
          <div>
            <Label htmlFor="type-description">Description</Label>
            <Input
              id="type-description"
              value={typeDescription}
              onChange={(event) => setTypeDescription(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTypeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={adminOpen} title="Add administrator" onClose={() => setAdminOpen(false)}>
        <form className="space-y-4" onSubmit={saveAdmin}>
          <div>
            <Label htmlFor="admin-name" required>
              Full name
            </Label>
            <Input id="admin-name" value={adminName} onChange={(event) => setAdminName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="admin-email" required>
              Email
            </Label>
            <Input id="admin-email" type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
            <Hint>Use the same email you will create in Supabase Authentication.</Hint>
            <FieldError message={adminError} />
          </div>
          <div>
            <Label htmlFor="admin-role">Role</Label>
            <select
              id="admin-role"
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
              value={adminRole}
              onChange={(event) => setAdminRole(event.target.value as AdminRole)}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdminOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Add
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingType)}
        title={pendingType?.is_active ? "Deactivate type?" : "Activate type?"}
        description="Inactive types are hidden from the employee form."
        confirmLabel={pendingType?.is_active ? "Deactivate" : "Activate"}
        onClose={() => setPendingType(null)}
        onConfirm={toggleType}
        busy={saving}
      />

      <ConfirmDialog
        open={Boolean(pendingAdmin)}
        title="Deactivate administrator?"
        description="They will no longer be able to access the dashboard."
        confirmLabel="Deactivate"
        danger
        busy={saving}
        onClose={() => setPendingAdmin(null)}
        onConfirm={deactivateAdmin}
      />
    </div>
  );
}

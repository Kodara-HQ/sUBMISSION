import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin/admin-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { Unauthorized } from "@/components/admin/unauthorized";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentAdmin } from "@/lib/auth";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, admin } = await getCurrentAdmin();
  if (!user) redirect("/login?next=/admin");
  if (!admin) return <Unauthorized />;

  return (
    <ToastProvider>
      <AdminProvider admin={admin}>
        <AdminShell admin={admin}>{children}</AdminShell>
      </AdminProvider>
    </ToastProvider>
  );
}

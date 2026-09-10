"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Building2,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { AdminUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/questions", label: "Questions", icon: HelpCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs tracking-wide text-white/60 uppercase">Admin</p>
        <p className="mt-1 text-lg font-semibold">Submission Portal</p>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium">{admin.full_name}</p>
        <p className="truncate text-xs text-white/60">{admin.email}</p>
        <Button
          variant="ghost"
          className="mt-3 w-full justify-start text-white hover:bg-white/10 hover:text-white"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-surface">
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">{sidebar}</div>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white px-4 py-3 md:hidden">
          <p className="font-semibold text-navy">Admin</p>
          <Button variant="ghost" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>
        {open ? (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              className="absolute inset-0 bg-navy/40"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
          </div>
        ) : null}
        <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

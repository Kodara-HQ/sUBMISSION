"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdminUser } from "@/lib/types";

const AdminContext = createContext<AdminUser | null>(null);

export function AdminProvider({
  admin,
  children,
}: {
  admin: AdminUser;
  children: ReactNode;
}) {
  return <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const admin = useContext(AdminContext);
  if (!admin) {
    throw new Error("Administrator context is unavailable.");
  }
  return admin;
}

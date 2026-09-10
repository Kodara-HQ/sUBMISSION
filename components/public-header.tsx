"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PublicHeader({
  showAdminLink = true,
}: {
  showAdminLink?: boolean;
}) {
  const [name, setName] = useState("Employee Spotlight");

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.rpc("get_public_settings").then(({ data }: { data: { organization_name?: string }[] | { organization_name?: string } | null }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.organization_name) setName(row.organization_name);
      });
    } catch {
      // Public header still renders with the default name.
    }
  }, []);

  return (
    <header className="border-b border-white/10 bg-navy text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-xs tracking-wide text-white/60 uppercase">Internal portal</p>
          <p className="truncate text-lg font-semibold">{name}</p>
        </Link>
        {showAdminLink ? (
          <Link href="/login" className="shrink-0 text-sm text-white/80 hover:text-white">
            Administrator sign in
          </Link>
        ) : (
          <Link href="/" className="shrink-0 text-sm text-white/80 hover:text-white">
            Home
          </Link>
        )}
      </div>
    </header>
  );
}

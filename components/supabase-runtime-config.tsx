"use client";

import { setRuntimeSupabaseConfig } from "@/lib/supabase/env";

/** Injects server-runtime Supabase public config into the browser client. */
export function SupabaseRuntimeConfig({
  url,
  anonKey,
}: {
  url: string;
  anonKey: string;
}) {
  if (url && anonKey) {
    setRuntimeSupabaseConfig({ url, key: anonKey });
  }
  return null;
}

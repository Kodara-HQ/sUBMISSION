"use client";

import { useEffect, useState } from "react";
import { setRuntimeSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Ensures the browser has Supabase URL/anon key even when NEXT_PUBLIC_* were
 * empty at build time (common on Vercel). Prefers server-injected props, then
 * falls back to /api/public-config.
 */
export function SupabaseRuntimeConfig({
  url,
  anonKey,
}: {
  url: string;
  anonKey: string;
}) {
  const [ready, setReady] = useState(() => {
    if (url && anonKey) {
      setRuntimeSupabaseConfig({ url, key: anonKey });
      return true;
    }
    return isSupabaseConfigured();
  });

  useEffect(() => {
    if (url && anonKey) {
      setRuntimeSupabaseConfig({ url, key: anonKey });
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/public-config", { cache: "no-store" });
        const body = (await response.json()) as {
          configured?: boolean;
          url?: string;
          key?: string;
        };
        if (cancelled) return;
        if (body.configured && body.url && body.key) {
          setRuntimeSupabaseConfig({ url: body.url, key: body.key });
          setReady(true);
          window.dispatchEvent(new Event("esp-supabase-ready"));
        } else {
          setReady(false);
        }
      } catch {
        if (!cancelled) setReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, anonKey]);

  // Expose readiness for forms that mount in the same tree.
  if (typeof window !== "undefined") {
    (window as unknown as { __ESP_SUPABASE_READY?: boolean }).__ESP_SUPABASE_READY = ready;
  }

  return null;
}

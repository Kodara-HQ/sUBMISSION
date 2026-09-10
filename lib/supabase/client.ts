import { createBrowserClient } from "@supabase/ssr";
import { isDemoMode } from "@/lib/demo/config";
import { createDemoClient } from "@/lib/demo/client";

export function createClient(): ReturnType<typeof createBrowserClient> {
  if (isDemoMode()) {
    return createDemoClient() as unknown as ReturnType<typeof createBrowserClient>;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }
  return createBrowserClient(url, key);
}

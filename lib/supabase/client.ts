import { createBrowserClient } from "@supabase/ssr";
import { isDemoMode } from "@/lib/demo/config";
import { createDemoClient } from "@/lib/demo/client";
import { assertSupabasePublicConfig } from "@/lib/supabase/env";

export function createClient(): ReturnType<typeof createBrowserClient> {
  if (isDemoMode()) {
    return createDemoClient() as unknown as ReturnType<typeof createBrowserClient>;
  }
  const { url, key } = assertSupabasePublicConfig();
  return createBrowserClient(url, key);
}

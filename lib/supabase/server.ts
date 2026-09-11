import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/demo/config";
import { createDemoClient } from "@/lib/demo/client";
import { assertSupabasePublicConfig } from "@/lib/supabase/env";

export async function createClient(): Promise<ReturnType<typeof createServerClient>> {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    return createDemoClient({ cookieHeader, persist: false }) as unknown as ReturnType<
      typeof createServerClient
    >;
  }

  const { url, key } = assertSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; middleware refreshes the session.
        }
      },
    },
  });
}

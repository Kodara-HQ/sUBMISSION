/** Browser-safe Supabase credentials (anon / publishable). */

type PublicConfig = { url: string; key: string };

let runtimeConfig: PublicConfig | null = null;

export function setRuntimeSupabaseConfig(config: PublicConfig) {
  const url = (config.url || "").trim();
  const key = (config.key || "").trim();
  if (url && key) runtimeConfig = { url, key };
}

/** Dynamic lookup avoids Next.js build-time inlining of empty NEXT_PUBLIC_* values. */
function readEnv(name: string) {
  return String(process.env[name] ?? "").trim();
}

function pickKey(...candidates: Array<string | undefined>) {
  const values = candidates.map((value) => (value || "").trim()).filter(Boolean);
  const jwt = values.find((value) => value.startsWith("eyJ"));
  return jwt || values[0] || "";
}

function readServerConfig(): PublicConfig {
  // Prefer non-NEXT_PUBLIC names — those are always available at Vercel request time.
  const url = readEnv("SUPABASE_URL") || readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = pickKey(
    readEnv("SUPABASE_ANON_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    readEnv("SUPABASE_PUBLISHABLE_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
  return { url, key };
}

export function getSupabasePublicConfig(): PublicConfig {
  if (runtimeConfig?.url && runtimeConfig?.key) {
    return runtimeConfig;
  }

  // In the browser, only the server-injected runtime config is trustworthy.
  // NEXT_PUBLIC_* may have been baked in as "" at build time.
  if (typeof window !== "undefined") {
    return { url: "", key: "" };
  }

  return readServerConfig();
}

export function assertSupabasePublicConfig() {
  const { url, key } = getSupabasePublicConfig();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. In Vercel set SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_*), then redeploy without build cache.",
    );
  }
  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabasePublicConfig();
  return Boolean(url && key && !url.includes("YOUR_PROJECT"));
}

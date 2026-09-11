/** Browser-safe Supabase credentials (anon / publishable). */

type PublicConfig = { url: string; key: string };

let runtimeConfig: PublicConfig | null = null;

export function setRuntimeSupabaseConfig(config: PublicConfig) {
  const url = (config.url || "").trim();
  const key = (config.key || "").trim();
  if (url && key) runtimeConfig = { url, key };
}

function pickKey(...candidates: Array<string | undefined>) {
  const values = candidates.map((value) => (value || "").trim()).filter(Boolean);
  const jwt = values.find((value) => value.startsWith("eyJ"));
  return jwt || values[0] || "";
}

export function getSupabasePublicConfig(): PublicConfig {
  if (runtimeConfig?.url && runtimeConfig?.key) {
    return runtimeConfig;
  }

  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();

  const key = pickKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  );

  return { url, key };
}

export function assertSupabasePublicConfig() {
  const { url, key } = getSupabasePublicConfig();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.",
    );
  }
  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabasePublicConfig();
  return Boolean(url && key && !url.includes("YOUR_PROJECT"));
}

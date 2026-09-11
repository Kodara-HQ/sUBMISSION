/** Browser-safe Supabase credentials (anon / publishable). */
export function getSupabasePublicConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  return { url, key };
}

export function assertSupabasePublicConfig() {
  const { url, key } = getSupabasePublicConfig();
  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }
  return { url, key };
}

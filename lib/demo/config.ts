import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const DEMO_COOKIE = "esp_demo_session";
export const DEMO_EMAIL = (
  process.env.NEXT_PUBLIC_DEMO_EMAIL ||
  process.env.ADMIN_BOOTSTRAP_EMAIL ||
  "lamadekue@gmail.com"
)
  .trim()
  .toLowerCase();
// Public demo credential used only when NEXT_PUBLIC_DEMO_MODE=true.
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "BLOJRP922";
export const DEMO_FULL_NAME =
  process.env.NEXT_PUBLIC_DEMO_FULL_NAME?.trim() || "Emmanuel Lamadeku";
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_ADMIN_ID = "00000000-0000-4000-8000-000000000002";

export function isDemoMode() {
  // Never use demo storage on Vercel — submissions must go to shared Supabase.
  if (process.env.VERCEL === "1" || process.env.NEXT_PUBLIC_VERCEL_ENV) return false;
  // Demo is opt-in only. Auto-fallback caused per-browser data that never reached a shared system.
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return false;
  const { url, key } = getSupabasePublicConfig();
  return !url || !key || url.includes("YOUR_PROJECT");
}

export function demoUser() {
  return {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: { full_name: DEMO_FULL_NAME },
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

export function demoAdmin() {
  return {
    id: DEMO_ADMIN_ID,
    user_id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    full_name: DEMO_FULL_NAME,
    role: "super_admin" as const,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

export function setDemoSessionCookie() {
  document.cookie = `${DEMO_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=2592000`;
}

export function clearDemoSessionCookie() {
  document.cookie = `${DEMO_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export function hasDemoSessionCookie(cookieHeader?: string) {
  const source =
    cookieHeader ?? (typeof document === "undefined" ? "" : document.cookie);
  return source.split(";").some((part) => part.trim() === `${DEMO_COOKIE}=1`);
}

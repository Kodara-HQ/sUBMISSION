export const DEMO_COOKIE = "esp_demo_session";
export const DEMO_EMAIL = "admin@portal.local";
export const DEMO_PASSWORD = "Admin123!";
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_ADMIN_ID = "00000000-0000-4000-8000-000000000002";

export function isDemoMode() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("YOUR_PROJECT");
}

export function demoUser() {
  return {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: { full_name: "Portal Administrator" },
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

export function demoAdmin() {
  return {
    id: DEMO_ADMIN_ID,
    user_id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    full_name: "Portal Administrator",
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

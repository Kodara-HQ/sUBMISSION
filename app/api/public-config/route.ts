import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readEnv(name: string) {
  return String(process.env[name] ?? "").trim();
}

function pickKey(...candidates: string[]) {
  const values = candidates.map((value) => value.trim()).filter(Boolean);
  const jwt = values.find((value) => value.startsWith("eyJ"));
  return jwt || values[0] || "";
}

/** Public anon credentials only — safe to expose to the browser. */
export async function GET() {
  const url = readEnv("SUPABASE_URL") || readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = pickKey(
    readEnv("SUPABASE_ANON_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    readEnv("SUPABASE_PUBLISHABLE_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );

  const configured = Boolean(url && key && !url.includes("YOUR_PROJECT"));

  return NextResponse.json(
    {
      configured,
      url: configured ? url : "",
      key: configured ? key : "",
      hasUrl: Boolean(url),
      hasKey: Boolean(key),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

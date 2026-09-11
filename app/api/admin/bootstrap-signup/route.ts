import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/config";

type Body = {
  email?: string;
  password?: string;
  full_name?: string;
};

export const dynamic = "force-dynamic";

function readEnv(name: string) {
  return String(process.env[name] ?? "").trim();
}

function pickKey(...candidates: string[]) {
  const values = candidates.map((value) => value.trim()).filter(Boolean);
  const jwt = values.find((value) => value.startsWith("eyJ"));
  return jwt || values[0] || "";
}

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 400 });
  }

  const expected = readEnv("ADMIN_BOOTSTRAP_EMAIL").toLowerCase();
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "ADMIN_BOOTSTRAP_EMAIL is not set in Vercel. Add it (lamadekue@gmail.com), then redeploy.",
      },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.full_name || "Emmanuel Lamadeku").trim() || "Emmanuel Lamadeku";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }

  if (email !== expected) {
    return NextResponse.json(
      {
        ok: false,
        message: `Sign-in failed. Use ${expected} (ADMIN_BOOTSTRAP_EMAIL), or reset that user’s password in Supabase → Authentication → Users.`,
      },
      { status: 403 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, message: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  const url = readEnv("SUPABASE_URL") || readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = pickKey(
    readEnv("SUPABASE_ANON_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    readEnv("SUPABASE_PUBLISHABLE_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );

  if (!url || !key) {
    return NextResponse.json(
      {
        ok: false,
        message: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.",
      },
      { status: 500 },
    );
  }

  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Prefer sign-in first in case the account already exists with this password.
    const existing = await supabase.auth.signInWithPassword({ email, password });
    if (!existing.error && existing.data.session) {
      return NextResponse.json({ ok: true, created: false });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      const message = error.message || "Unable to create administrator account.";
      if (/already|registered|exists/i.test(message)) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "This email already exists in Supabase Auth, but that password is wrong. Open Supabase → Authentication → Users → lamadekue@gmail.com → Reset password (or delete the user and sign in again to recreate it).",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    // Supabase may return a user with empty identities when the email is taken (no error).
    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "This email already exists in Supabase Auth, but that password is wrong. Open Supabase → Authentication → Users → lamadekue@gmail.com → Reset password (or delete the user and sign in again to recreate it).",
        },
        { status: 409 },
      );
    }

    if (!data.session) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Account created, but email confirmation is required. In Supabase: Authentication → Providers → Email → disable Confirm email. Then delete this user under Authentication → Users and sign in again.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, created: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to provision administrator." }, { status: 500 });
  }
}

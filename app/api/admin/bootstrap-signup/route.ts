import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/config";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

type Body = {
  email?: string;
  password?: string;
  full_name?: string;
};

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 400 });
  }

  const expected = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!expected) {
    return NextResponse.json({ ok: false, message: "Bootstrap email is not configured." }, { status: 403 });
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
    return NextResponse.json({ ok: false, message: "Only the bootstrap administrator can be provisioned." }, { status: 403 });
  }

  const { url, key } = getSupabasePublicConfig();
  if (!url || !key) {
    return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 500 });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      const message = error.message || "Unable to create administrator account.";
      // User may already exist with a different password.
      if (/already|registered|exists/i.test(message)) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "This email already exists in Supabase Auth. Reset the password in Authentication → Users, or use the correct password.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    if (!data.session) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Account created, but email confirmation is required. In Supabase: Authentication → Providers → Email → disable Confirm email, then try again. Or create the user in Authentication → Users with Auto Confirm enabled.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, created: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to provision administrator." }, { status: 500 });
  }
}

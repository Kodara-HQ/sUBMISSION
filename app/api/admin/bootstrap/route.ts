import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const expected = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "ADMIN_BOOTSTRAP_EMAIL is not configured on the server." },
      { status: 403 },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email || user.email.toLowerCase() !== expected) {
      return NextResponse.json(
        { ok: false, message: "This account is not the bootstrap administrator." },
        { status: 403 },
      );
    }

    const { data: claimed } = await supabase.rpc("claim_admin_invite");
    const claimedRow = Array.isArray(claimed) ? claimed[0] : claimed;
    if (claimedRow?.id) {
      return NextResponse.json({ ok: true, claimed: true });
    }

    const { error } = await supabase.rpc("bootstrap_admin");
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message:
            error.message ||
            "Could not create the administrator profile. Run supabase/bootstrap-admin.sql in the Supabase SQL Editor.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Administrator bootstrap failed. Please try again." },
      { status: 500 },
    );
  }
}

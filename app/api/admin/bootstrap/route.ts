import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const expected = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!expected) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email || user.email.toLowerCase() !== expected) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const { error } = await supabase.rpc("bootstrap_admin");
    if (error) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

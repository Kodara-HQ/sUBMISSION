import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/config";
import { readServerDemoDb, writeServerDemoDb } from "@/lib/demo/server-store";
import type { DemoDB } from "@/lib/demo/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Demo mode is disabled." }, { status: 404 });
  }
  return NextResponse.json(readServerDemoDb());
}

export async function PUT(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Demo mode is disabled." }, { status: 404 });
  }
  try {
    const body = (await request.json()) as DemoDB;
    if (!body || typeof body !== "object" || !Array.isArray(body.submissions)) {
      return NextResponse.json({ error: "Invalid demo database payload." }, { status: 400 });
    }
    writeServerDemoDb(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save demo database." }, { status: 400 });
  }
}

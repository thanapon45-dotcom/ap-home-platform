import { NextRequest, NextResponse } from "next/server";

/**
 * /api/leads — server-side proxy to Supabase `leads` table.
 * Uses SUPABASE_SERVICE_KEY (service_role, bypasses RLS) — never exposed to the browser.
 * Added session 25 (Jul 16, 2026) to close the anon-key CRUD exposure on `leads`
 * (see docs/issues-log.md ISSUE-013, CLAUDE.md Pending Tasks → Security).
 *
 * GET  — list leads (ordered by created_at desc)
 * POST — insert one lead, or many via { rows: [...] } (used by CSV import + public Budget Tool)
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc`, {
      headers: headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [body];

    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(rows),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    // single-object callers (AddLeadModal) expect one record back, not an array
    return NextResponse.json({ ok: true, data: Array.isArray(body?.rows) ? data : data[0] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

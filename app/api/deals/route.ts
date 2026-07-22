import { NextRequest, NextResponse } from "next/server";

/**
 * /api/deals — server-side proxy to Supabase `reno_deals` table (Fix & Flip pipeline).
 * Uses SUPABASE_SERVICE_KEY (service_role, bypasses RLS) — never exposed to the browser.
 * Added session 27+ (Jul 22, 2026) — builds on the pre-existing but previously
 * unused `reno_deals` table (0 rows, no code references before this). Added
 * pipeline fields (name, stage, reno_budget, list_price, lead_id, updated_at)
 * via migration and dropped the anon_read policy that was open on it — same
 * lockdown pattern as leads/projects (see docs/issues-log.md ISSUE-013).
 *
 * GET  — list latest 100 deals
 * POST — insert one deal
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reno_deals?select=*&order=created_at.desc&limit=100`, {
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reno_deals`, {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify([body]),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    return NextResponse.json({ ok: true, data: data[0] ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

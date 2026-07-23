import { NextRequest, NextResponse } from "next/server";

/**
 * /api/projects — server-side proxy to Supabase `projects` table (Land Analyzer).
 * Uses SUPABASE_SERVICE_KEY (service_role, bypasses RLS) — never exposed to the browser.
 * Added session 25 (Jul 16, 2026) — see docs/issues-log.md ISSUE-013.
 *
 * GET  — list latest 20 projects, or ?ids=uuid1,uuid2 to fetch specific rows
 *        (added session 29 ADR-022, for Deals.tsx to look up the estimated
 *        ROI of a project linked via reno_deals.land_project_id — a plain
 *        "latest 20" list can miss older linked projects)
 * POST — insert one project
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

export async function GET(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const idsParam = req.nextUrl.searchParams.get("ids");
    const url = idsParam
      ? `${SUPABASE_URL}/rest/v1/projects?select=*&id=in.(${idsParam.split(",").map(s => s.trim()).filter(Boolean).join(",")})`
      : `${SUPABASE_URL}/rest/v1/projects?select=*&order=created_at.desc&limit=20`;
    const res = await fetch(url, { headers: headers() });
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
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

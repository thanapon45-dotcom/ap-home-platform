import { NextRequest, NextResponse } from "next/server";

/**
 * /api/deals/[id] — server-side proxy to Supabase `reno_deals` (single row).
 * See app/api/deals/route.ts for the security rationale (service_role only,
 * RLS enabled with zero policies — ISSUE-013 pattern).
 *
 * PATCH  — update one deal
 * DELETE — remove one deal
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reno_deals?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    return NextResponse.json({ ok: true, data: data[0] ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const { id } = await params;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reno_deals?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

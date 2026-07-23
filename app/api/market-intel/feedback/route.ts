import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/market-intel/feedback — records a human's confirmation of whether
 * a past market_insights row (AI-assigned confidence 1-5) actually held up.
 *
 * Item #3 of the "system proves itself correct" follow-up plan (ADR-023,
 * session 29). market_insights has no separate review channel — same
 * situation as the WF1 Quality Gate (ADR-021) — so this dashboard IS the
 * feedback mechanism.
 *
 * Body: { id: number, feedback: "accurate" | "inaccurate" }
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
}

export async function PATCH(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const { id, feedback } = body as { id?: number; feedback?: string };

    if (id == null || (feedback !== "accurate" && feedback !== "inaccurate")) {
      return NextResponse.json({ ok: false, error: "ต้องระบุ id และ feedback ('accurate' หรือ 'inaccurate')" }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/market_insights?id=eq.${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ human_feedback: feedback, human_feedback_at: new Date().toISOString() }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Supabase PATCH failed (${res.status})`);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

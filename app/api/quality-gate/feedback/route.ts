import { NextResponse } from "next/server";

/**
 * PATCH /api/quality-gate/feedback — records a human's confirmation of whether
 * a past WF1 AI Quality Gate decision (pass/block) was actually correct.
 *
 * Unlike qc_inspections (fed by LINE quick-reply buttons via Hub v1), the
 * quality_gate_log table has no separate review channel — this dashboard
 * IS the feedback mechanism, mirroring the QC LINE "✅ ตรง / ❌ ไม่ตรง" pattern
 * but submitted here directly. Added session 29 (ADR-021).
 *
 * Body: { id: string, feedback: "correct" | "incorrect" }
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

export async function PATCH(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const { id, feedback } = body as { id?: string; feedback?: string };

    if (!id || (feedback !== "correct" && feedback !== "incorrect")) {
      return NextResponse.json({ ok: false, error: "ต้องระบุ id และ feedback ('correct' หรือ 'incorrect')" }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/quality_gate_log?id=eq.${encodeURIComponent(id)}`, {
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

import { NextResponse } from "next/server";

/**
 * /api/quality-gate/accuracy — server-side proxy to Supabase `quality_gate_log`.
 * Computes AI Quality Gate (WF1, ADR-016) accuracy stats from the human_feedback
 * field, which — unlike qc_inspections (fed by the LINE bot) — is submitted
 * directly from this dashboard via PATCH /api/quality-gate/feedback, since the
 * gate has no separate human-review channel of its own.
 *
 * Added session 29 (ADR-021) — item #2 of the 3-item "system proves itself
 * correct" follow-up plan. Same honest-low-data-state pattern as
 * /api/qc/accuracy: below RELIABILITY_THRESHOLD, reliable:false so the UI
 * shows "ยังไม่มีข้อมูลพอสรุป" instead of a misleading headline % from a
 * handful of rows. Uses SUPABASE_SERVICE_KEY (service_role, bypasses RLS,
 * never exposed to the browser).
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const RELIABILITY_THRESHOLD = 10; // min # of feedback rows before we'll show a headline %

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  pass: boolean;
  reasons: string[] | null;
  run_id: string | null;
  queue_item_id: string | null;
  created_at: string;
  human_feedback: string | null;
  human_feedback_at: string | null;
};

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/quality_gate_log?select=id,slug,title,pass,reasons,run_id,queue_item_id,created_at,human_feedback,human_feedback_at&order=created_at.desc&limit=200`,
      { headers: headers() }
    );
    const rows = (await res.json()) as Row[];
    if (!res.ok) throw new Error(typeof rows === "object" ? JSON.stringify(rows) : String(rows));

    const total = rows.length;
    const blocked = rows.filter(r => !r.pass).length;
    const passed = total - blocked;
    const withFeedback = rows.filter(r => !!r.human_feedback);
    const correct = withFeedback.filter(r => r.human_feedback === "correct").length;
    const incorrect = withFeedback.filter(r => r.human_feedback === "incorrect").length;

    // false positives = gate blocked something a human later confirmed should have passed
    const falsePositives = withFeedback.filter(r => !r.pass && r.human_feedback === "incorrect").length;
    // false negatives = gate passed something a human later confirmed should have been blocked
    const falseNegatives = withFeedback.filter(r => r.pass && r.human_feedback === "incorrect").length;

    const dates = rows.map(r => r.created_at).filter(Boolean).sort();
    const window = dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;

    const feedbackAdoptionPct = total > 0 ? Math.round((withFeedback.length / total) * 1000) / 10 : 0;
    const accuracyPct = withFeedback.length > 0 ? Math.round((correct / withFeedback.length) * 1000) / 10 : null;
    const reliable = withFeedback.length >= RELIABILITY_THRESHOLD;

    return NextResponse.json({
      ok: true,
      data: {
        total_decisions: total,
        passed,
        blocked,
        with_feedback: withFeedback.length,
        correct,
        incorrect,
        false_positives: falsePositives,
        false_negatives: falseNegatives,
        accuracy_pct: accuracyPct,
        feedback_adoption_pct: feedbackAdoptionPct,
        reliable,
        threshold: RELIABILITY_THRESHOLD,
        window,
        recent: rows.slice(0, 20),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

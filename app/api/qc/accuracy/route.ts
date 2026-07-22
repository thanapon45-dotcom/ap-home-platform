import { NextResponse } from "next/server";

/**
 * /api/qc/accuracy — server-side proxy to Supabase `qc_inspections`.
 * Computes AI QC accuracy stats from the human_feedback field (set via the
 * LINE "✅ ตรง / ❌ ไม่ตรง" quick-reply buttons — see CLAUDE.md Known Bugs #7,
 * Hub v1 endpoint POST /api/qc/feedback).
 *
 * Added session 28 (Jul 22, 2026) — Phase 1 of the "system proves itself
 * correct" plan (see conversation this session). Uses SUPABASE_SERVICE_KEY
 * (service_role, bypasses RLS) — never exposed to the browser.
 *
 * IMPORTANT: as of this session, real data is only 20 total inspections
 * (all from a one-week test window 2026-06-26 to 2026-07-02) with just 1
 * row carrying human_feedback. Below RELIABILITY_THRESHOLD, `reliable:false`
 * is returned so the UI shows an honest "not enough data yet" state instead
 * of a misleading headline percentage computed from n=1.
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
  created_at: string;
  severity: string | null;
  pass: boolean | null;
  human_feedback: string | null;
  human_feedback_at: string | null;
};

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/qc_inspections?select=id,created_at,severity,pass,human_feedback,human_feedback_at&order=created_at.desc`,
      { headers: headers() }
    );
    const rows = (await res.json()) as Row[];
    if (!res.ok) throw new Error(typeof rows === "object" ? JSON.stringify(rows) : String(rows));

    const total = rows.length;
    const withFeedback = rows.filter(r => !!r.human_feedback);
    const correct = withFeedback.filter(r => r.human_feedback === "correct").length;
    const incorrect = withFeedback.filter(r => r.human_feedback === "incorrect").length;
    const otherFeedback = withFeedback.length - correct - incorrect;

    const bySeverityMap = new Map<string, { total: number; withFeedback: number; correct: number; incorrect: number }>();
    for (const r of rows) {
      const key = r.severity ?? "ไม่ระบุ";
      const entry = bySeverityMap.get(key) ?? { total: 0, withFeedback: 0, correct: 0, incorrect: 0 };
      entry.total += 1;
      if (r.human_feedback === "correct") { entry.withFeedback += 1; entry.correct += 1; }
      else if (r.human_feedback === "incorrect") { entry.withFeedback += 1; entry.incorrect += 1; }
      bySeverityMap.set(key, entry);
    }
    const bySeverity = Array.from(bySeverityMap.entries())
      .map(([severity, v]) => ({ severity, ...v }))
      .sort((a, b) => b.total - a.total);

    const dates = rows.map(r => r.created_at).filter(Boolean).sort();
    const window = dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;

    const feedbackAdoptionPct = total > 0 ? Math.round((withFeedback.length / total) * 1000) / 10 : 0;
    const accuracyPct = withFeedback.length > 0 ? Math.round((correct / withFeedback.length) * 1000) / 10 : null;
    const reliable = withFeedback.length >= RELIABILITY_THRESHOLD;

    return NextResponse.json({
      ok: true,
      data: {
        total_inspections: total,
        with_feedback: withFeedback.length,
        correct,
        incorrect,
        other_feedback: otherFeedback,
        accuracy_pct: accuracyPct,
        feedback_adoption_pct: feedbackAdoptionPct,
        reliable,
        threshold: RELIABILITY_THRESHOLD,
        by_severity: bySeverity,
        window,
        recent: rows.slice(0, 15),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

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
  human_feedback_reason: string | null;
  ai_model: string | null;
  engine_version: string | null;
};

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/qc_inspections?select=id,created_at,severity,pass,human_feedback,human_feedback_at,human_feedback_reason,ai_model,engine_version&order=created_at.desc`,
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

    // Accuracy v2: keep the currently deployed Gemini engine separate from
    // historical GPT-era results so the headline cannot hide regressions.
    const currentEngineVersion = "qc-v2.1-deterministic-refbudget-feedback";
    const versionedCurrentRows = rows.filter(r => r.engine_version === currentEngineVersion);
    const currentRows = versionedCurrentRows.length
      ? versionedCurrentRows
      : rows.filter(r => r.ai_model === "gemini:gemini-3.8-flash");
    const currentFeedback = currentRows.filter(r => !!r.human_feedback);
    const currentCorrect = currentFeedback.filter(r => r.human_feedback === "correct").length;
    const currentIncorrect = currentFeedback.filter(r => r.human_feedback === "incorrect").length;
    const currentAccuracyPct = currentFeedback.length
      ? Math.round((currentCorrect / currentFeedback.length) * 1000) / 10
      : null;

    const feedbackReasons = new Map<string, number>();
    for (const r of withFeedback) {
      if (r.human_feedback === "incorrect") {
        const key = r.human_feedback_reason || "unclassified";
        feedbackReasons.set(key, (feedbackReasons.get(key) || 0) + 1);
      }
    }

    const byModelMap = new Map<string, { total: number; withFeedback: number; correct: number; incorrect: number }>();
    for (const r of rows) {
      const key = r.ai_model || "unknown";
      const entry = byModelMap.get(key) || { total: 0, withFeedback: 0, correct: 0, incorrect: 0 };
      entry.total++;
      if (r.human_feedback === "correct") { entry.withFeedback++; entry.correct++; }
      else if (r.human_feedback === "incorrect") { entry.withFeedback++; entry.incorrect++; }
      byModelMap.set(key, entry);
    }
    const byModel = Array.from(byModelMap.entries()).map(([model, v]) => ({
      model, ...v,
      accuracy_pct: v.withFeedback ? Math.round((v.correct / v.withFeedback) * 1000) / 10 : null
    }));

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
        current_engine: {
          model: "gemini:gemini-3.8-flash",
          engine_version: versionedCurrentRows.length ? currentEngineVersion : null,
          total: currentRows.length,
          with_feedback: currentFeedback.length,
          correct: currentCorrect,
          incorrect: currentIncorrect,
          accuracy_pct: currentAccuracyPct,
          reliable: currentFeedback.length >= RELIABILITY_THRESHOLD,
        },
        by_model: byModel,
        feedback_reasons: Array.from(feedbackReasons.entries()).map(([reason, count]) => ({ reason, count })),
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

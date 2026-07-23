import { NextResponse } from "next/server";

/**
 * /api/market-intel/calibration — server-side proxy to Supabase `market_insights`.
 * Computes whether the AI's own 1-5 confidence score on each insight is
 * actually calibrated — i.e. do "5-star" insights turn out accurate more
 * often than "3-star" ones? — from human_feedback set via this dashboard
 * (PATCH /api/market-intel/feedback).
 *
 * Item #3 of the "system proves itself correct" follow-up plan (ADR-023,
 * session 29). Same honest low-data-state pattern as qc/accuracy and
 * quality-gate/accuracy: market_insights already has 135 real rows (unlike
 * quality_gate_log which started at 0), but human_feedback starts at 0 for
 * all of them since the feedback buttons are new — so `reliable:false` until
 * enough insights have been confirmed one way or the other.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const RELIABILITY_THRESHOLD = 10; // min # of feedback rows before we'll show calibration-by-confidence

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

type Row = {
  id: number;
  created_at: string;
  area: string | null;
  insight: string | null;
  category: string | null;
  confidence: number;
  source_type: string | null;
  human_feedback: string | null;
  human_feedback_at: string | null;
};

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/market_insights?select=id,created_at,area,insight,category,confidence,source_type,human_feedback,human_feedback_at&order=created_at.desc&limit=200`,
      { headers: headers() }
    );
    const rows = (await res.json()) as Row[];
    if (!res.ok) throw new Error(typeof rows === "object" ? JSON.stringify(rows) : String(rows));

    const total = rows.length;
    const withFeedback = rows.filter(r => !!r.human_feedback);
    const accurate = withFeedback.filter(r => r.human_feedback === "accurate").length;
    const inaccurate = withFeedback.filter(r => r.human_feedback === "inaccurate").length;

    const byConfMap = new Map<number, { total: number; withFeedback: number; accurate: number; inaccurate: number }>();
    for (const r of rows) {
      const key = r.confidence;
      const entry = byConfMap.get(key) ?? { total: 0, withFeedback: 0, accurate: 0, inaccurate: 0 };
      entry.total += 1;
      if (r.human_feedback === "accurate") { entry.withFeedback += 1; entry.accurate += 1; }
      else if (r.human_feedback === "inaccurate") { entry.withFeedback += 1; entry.inaccurate += 1; }
      byConfMap.set(key, entry);
    }
    const byConfidence = Array.from(byConfMap.entries())
      .map(([confidence, v]) => ({
        confidence,
        ...v,
        accuracy_pct: v.withFeedback > 0 ? Math.round((v.accurate / v.withFeedback) * 1000) / 10 : null,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const dates = rows.map(r => r.created_at).filter(Boolean).sort();
    const window = dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;

    const feedbackAdoptionPct = total > 0 ? Math.round((withFeedback.length / total) * 1000) / 10 : 0;
    const accuracyPct = withFeedback.length > 0 ? Math.round((accurate / withFeedback.length) * 1000) / 10 : null;
    const reliable = withFeedback.length >= RELIABILITY_THRESHOLD;

    return NextResponse.json({
      ok: true,
      data: {
        total_insights: total,
        with_feedback: withFeedback.length,
        accurate,
        inaccurate,
        accuracy_pct: accuracyPct,
        feedback_adoption_pct: feedbackAdoptionPct,
        reliable,
        threshold: RELIABILITY_THRESHOLD,
        by_confidence: byConfidence,
        window,
        recent: rows.slice(0, 20),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

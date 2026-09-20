import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

function headers() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

async function select(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${table}: HTTP ${res.status}`);
  return res.json();
}

/**
 * GET /api/brains/context
 *
 * Read-only shared business context for AP-Home modules and AI Assistant.
 * This is an aggregation layer, not a new source-of-truth table.
 *
 * buyer_context_signals has no area column in the production schema,
 * so area filtering is intentionally not applied to that table.
 */
export async function GET(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }

  const area = req.nextUrl.searchParams.get("area")?.trim() || "";
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 10, 1), 50);

  try {
    const areaFilter = area ? `&area=eq.${encodeURIComponent(area)}` : "";

    const [marketInsights, marketSummary, areaMemory, buyerSignals, deals, qc, content] =
      await Promise.all([
        select(
          "market_insights",
          `select=area,insight,category,confidence,source_type,created_at&order=created_at.desc&limit=${limit}${areaFilter}`
        ),
        select(
          "market_intelligence_summary",
          `select=area,category,insight_count,avg_confidence,verified_count,latest_at&order=insight_count.desc&limit=${limit}${area ? `&area=eq.${encodeURIComponent(area)}` : ""}`
        ),
        select(
          "area_memory",
          `select=area,memory,memory_type,confidence,is_active,last_verified,updated_at&order=updated_at.desc&limit=${limit}${area ? `&area=eq.${encodeURIComponent(area)}` : ""}`
        ),
        select(
          "buyer_context_signals",
          `select=lead_id,trigger_type,awareness_level,emotional_need,content_angle,channel,created_at&order=created_at.desc&limit=${limit}`
        ),
        select(
          "reno_deals",
          `select=id,name,area_name,property_address,stage,purchase_price,reno_budget,reno_cost,list_price,sale_price,roi_pct,days_to_sell,land_project_id,created_at,updated_at&order=updated_at.desc&limit=${limit}${area ? `&area_name=eq.${encodeURIComponent(area)}` : ""}`
        ),
        select(
          "qc_inspections",
          `select=id,site_id,pass,severity,confidence,status,human_feedback,created_at&order=created_at.desc&limit=${limit}`
        ),
        select(
          "content_frames",
          `select=id,frame_type,target_segment,keyword,channel,engagement_score,collector_version,created_at&order=created_at.desc&limit=${limit}`
        ),
      ]);

    const qcFeedback = qc.filter((r: any) => r.human_feedback != null);
    const dealsClosed = deals.filter((r: any) => r.stage === "closed");
    const marketVerified = marketInsights.filter((r: any) => Number(r.confidence) >= 4);
    const buyerLinked = buyerSignals.filter((r: any) => r.lead_id != null);
    const contentMeasured = content.filter((r: any) => r.engagement_score != null);

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      scope: area || "all",
      market: {
        summary: marketSummary,
        recent_insights: marketInsights,
        verified_insights: marketVerified,
        area_memory: areaMemory,
        buyer_context_signals: buyerSignals,
        buyer_context_signals_linked_to_leads: buyerLinked.length,
      },
      investment: {
        deals,
        closed_deals: dealsClosed,
        count: deals.length,
        linked_to_land_projects: deals.filter((r: any) => r.land_project_id != null).length,
      },
      construction: {
        qc_recent: qc,
        feedback_count: qcFeedback.length,
        site_linked_count: qc.filter((r: any) => r.site_id != null).length,
      },
      content: {
        recent_frames: content,
        measured_frames: contentMeasured.length,
      },
      evidence: {
        relationships_inferred: false,
        note: "Brains aggregates existing records only. It does not invent identity links between properties, sites, projects, deals, or QC inspections.",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Brains context failed" }, { status: 500 });
  }
}

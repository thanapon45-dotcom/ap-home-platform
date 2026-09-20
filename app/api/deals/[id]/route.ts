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
    const deal = data[0] ?? null;

    // Connect Deals -> Market Intelligence (session 33+): a closed Fix & Flip
    // deal is a verified, real outcome — worth feeding back into market_insights
    // so it shows up alongside AI-parsed observations. Best-effort: never let
    // this block or fail the deal update itself if it errors.
    if (body?.stage === "closed" && deal) {
      const area = deal.area_name || deal.property_address || "ไม่ระบุพื้นที่";
      const roi = deal.roi_pct != null ? `${Number(deal.roi_pct).toFixed(1)}%` : "ไม่ระบุ";
      const sale = deal.sale_price != null ? Number(deal.sale_price).toLocaleString("th-TH") : "ไม่ระบุ";
      try {
        // Awaited on purpose: Vercel serverless functions may kill un-awaited
        // background work the moment the response is sent — there is no
        // waitUntil() helper anywhere in this repo to defer it safely instead.
        await fetch(`${SUPABASE_URL}/rest/v1/market_insights`, {
          method: "POST",
          headers: headers({ Prefer: "return=minimal" }),
          body: JSON.stringify([{
            area,
            insight: `ปิดดีล Fix & Flip "${deal.name ?? "ไม่ระบุชื่อ"}" แล้ว — ราคาขายจริง ${sale} บาท, ROI จริง ${roi}`,
            category: "price_behavior",
            confidence: 5, // verified real transaction, not an AI guess
            source_type: "deal_closed",
            notes: deal.notes ?? null,
          }]),
        });
      } catch { /* best-effort — a failed signal write must not fail the deal close */ }
    }

    return NextResponse.json({ ok: true, data: deal });
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

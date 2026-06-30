import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "";

export async function POST(_req: NextRequest) {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    // Forward body from Dashboard to Hub (keyword, category, queue_item_id)
    let body = {};
    try { body = await _req.json(); } catch { /* empty body is fine */ }

    console.log("[run-next] targeting hub:", HUB.slice(0, 60));
    const r = await fetch(`${HUB}/api/blog/queue/run-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-secret": process.env.HUB_SECRET ?? "" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ ok: false }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Queue run-next failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

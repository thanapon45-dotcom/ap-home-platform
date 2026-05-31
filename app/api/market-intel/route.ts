import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK = "https://primary-production-8158a.up.railway.app/webhook/market-intel/manual";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: body.text,
        area: body.area || null,
        timing_signal: body.timing_signal || body.timing || null,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, body: text });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

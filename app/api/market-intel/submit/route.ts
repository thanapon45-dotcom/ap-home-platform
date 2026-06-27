import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK = process.env.N8N_MARKET_INTEL_WEBHOOK ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!N8N_WEBHOOK) {
      return NextResponse.json({ ok: false, error: "N8N_MARKET_INTEL_WEBHOOK not configured" }, { status: 500 });
    }
    const res = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`n8n returned ${res.status}`);
    const data = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json({ ok: true, ...data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

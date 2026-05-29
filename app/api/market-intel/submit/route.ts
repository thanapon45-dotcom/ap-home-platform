import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK = "https://primary-production-8158a.up.railway.app/webhook/market-intel/manual";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

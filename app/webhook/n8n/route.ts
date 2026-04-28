import { NextRequest, NextResponse } from "next/server";

/**
 * POST /webhook/n8n
 * Receives callback from n8n pipeline stages → proxy to Hub /webhook/n8n
 *
 * n8n sends hub_callback_url = HUB_PUBLIC_BASE_URL/webhook/n8n
 * If HUB_PUBLIC_BASE_URL points to Vercel, this route catches it and forwards to Railway Hub.
 */

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await fetch(`${HUB}/webhook/n8n`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ ok: true }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook proxy failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

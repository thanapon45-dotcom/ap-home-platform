import { createHmac, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /webhook/n8n
 * Receives callback from n8n pipeline stages → proxy to Hub /webhook/n8n
 *
 * n8n sends hub_callback_url = HUB_PUBLIC_BASE_URL/webhook/n8n
 * If HUB_PUBLIC_BASE_URL points to Vercel, this route catches it and forwards to Railway Hub.
 */

const HUB = process.env.HUB_URL ?? "";
const HUB_SECRET = process.env.HUB_SECRET ?? "";

function signRunToken(runId: string) {
  return createHmac("sha256", HUB_SECRET).update(`n8n:${runId}`).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = req.nextUrl.searchParams.get("token") ?? "";
    const runId = String(body?.runId || "");
    const correlationId = req.headers.get("x-correlation-id") ?? randomUUID();

    if (!HUB_SECRET) {
      return NextResponse.json({ ok: false, error: "HUB_SECRET not configured" }, { status: 500 });
    }
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    if (!runId || token !== signRunToken(runId)) {
      return NextResponse.json({ ok: false, error: "Invalid webhook token" }, { status: 401 });
    }

    const r = await fetch(`${HUB}/webhook/n8n`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-token": HUB_SECRET,
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ ok: true }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook proxy failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

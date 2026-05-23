import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/fb/publish
 * Server-side proxy → FB Backend (easygoing-friendship on Railway)
 * Bypasses Hub to avoid CORS and Railway routing issues.
 * Body: { content: string, runId?: string }
 */

const FB_BACKEND =
  process.env.FB_BACKEND_URL ??
  "https://easygoing-friendship-production-e663.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const r = await fetch(`${FB_BACKEND}/api/fb/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000), // 25s — Railway cold-start can take ~20s
    });

    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FB publish failed";
    const isTimeout = message.includes("timeout") || message.includes("abort");
    console.error("[api/fb/publish] error:", message);
    return NextResponse.json(
      { ok: false, error: isTimeout ? "FB Backend กำลังเริ่มต้น กรุณาลองใหม่ใน 30 วินาที" : message },
      { status: 503 }
    );
  }
}

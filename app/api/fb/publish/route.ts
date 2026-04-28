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
    });

    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FB publish failed";
    console.error("[api/fb/publish] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

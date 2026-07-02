import { NextResponse } from "next/server";

/**
 * GET /api/blog/state
 * Server-side proxy → Hub /api/state
 */

const HUB = process.env.HUB_URL ?? "";

export async function GET() {
  try {
    if (!HUB) {
      return NextResponse.json({ blog: { status: "idle" }, error: "HUB_URL not configured" }, { status: 500 });
    }
    const r = await fetch(`${HUB}/api/state`, {
      cache: "no-store",
      headers: { "x-hub-token": process.env.HUB_SECRET ?? "" },
      signal: AbortSignal.timeout(8000), // ป้องกัน Vercel 10s platform timeout
    });
    if (!r.ok) {
      // TEMP DEBUG (session 19, Jul 2) — remove after HUB_URL/HUB_SECRET mismatch is diagnosed.
      // Does NOT expose the full secret: only length + first/last 4 chars.
      const secret = process.env.HUB_SECRET ?? "";
      return NextResponse.json({
        blog: { status: "idle" },
        error: `Hub returned ${r.status}`,
        debug: {
          hubUrlFull: HUB,
          secretLength: secret.length,
          secretPrefix: secret.slice(0, 4),
          secretSuffix: secret.slice(-4),
        },
      });
    }
    const text = await r.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ blog: { status: "idle" }, error: "Hub ตอบกลับผิดรูปแบบ (ไม่ใช่ JSON)" });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "State fetch failed";
    return NextResponse.json({ blog: { status: "idle" }, error: message });
  }
}

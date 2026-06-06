import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await fetch(`${HUB}/action/property/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-token": process.env.HUB_SECRET ?? "" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ ok: false }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Property publish failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

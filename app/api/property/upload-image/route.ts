import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const blob = await req.blob();
    const filename = req.headers.get("x-filename") ?? "photo.jpg";
    const mimetype = blob.type || "image/jpeg";

    const r = await fetch(`${HUB}/action/property/upload-image`, {
      method: "POST",
      headers: {
        "Content-Type": mimetype,
        "x-filename": filename,
        "x-hub-token": process.env.HUB_SECRET ?? "",
      },
      body: blob,
    });
    const data = await r.json().catch(() => ({ ok: false }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

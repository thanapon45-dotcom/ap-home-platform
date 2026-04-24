import { NextResponse } from "next/server";

const N8N_URL    = process.env.N8N_URL ?? "http://localhost:5678";
const N8N_APIKEY = process.env.N8N_API_KEY;

// GET /api/n8n — list all workflows
export async function GET() {
  if (!N8N_APIKEY) {
    return NextResponse.json({ ok: false, error: "N8N_API_KEY not configured" });
  }

  try {
    const res  = await fetch(`${N8N_URL}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": N8N_APIKEY },
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, workflows: data.data ?? data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

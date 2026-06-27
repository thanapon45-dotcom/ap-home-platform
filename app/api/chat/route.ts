import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat
 * General-purpose Claude API call — used by CRM tabs, AI Content, image concept gen
 * Body: { system: string, prompt: string, maxTokens?: number, model?: string }
 * model defaults to haiku (fast/cheap). Pass "claude-sonnet-4-6" for higher quality Thai writing.
 *
 * v2: injects top-5 content_frames from Supabase into system prompt automatically
 */

const ALLOWED_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
];

/**
 * Fetch top-5 content_frames from Supabase and format as system prompt appendix.
 * Returns "" if Supabase is unavailable or table is empty — never throws.
 * Cached 5 minutes to avoid hitting Supabase on every generate() call.
 */
async function fetchContentFrames(): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return "";
  try {
    const res = await fetch(
      `${url}/rest/v1/content_frames?select=positioning_angle,emotional_hook,content_angle&order=created_at.desc&limit=5`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 300 }, // cache 5 min
      }
    );
    if (!res.ok) return "";
    const frames: { positioning_angle?: string; emotional_hook?: string; content_angle?: string }[] = await res.json();
    if (!Array.isArray(frames) || frames.length === 0) return "";
    const lines = frames
      .map(f =>
        `- [${f.positioning_angle ?? "general"}] ${f.emotional_hook ?? ""}${f.content_angle ? ` → ${f.content_angle}` : ""}`
      )
      .join("\n");
    return `\n\nPositioned Content Frames (จาก Market Intelligence — ใช้เป็น angle ในการสร้าง content):\n${lines}`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const { system, prompt, maxTokens = 1200, model = "claude-haiku-4-5-20251001" } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY ไม่ได้ตั้งค่า" }, { status: 500 });
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const safeModel = ALLOWED_MODELS.includes(model) ? model : "claude-haiku-4-5-20251001";

  // Fetch content_frames and inject into system prompt
  const frameContext = await fetchContentFrames();
  const baseSystem = system ?? "คุณเป็นผู้เชี่ยวชาญด้านอสังหาริมทรัพย์และธุรกิจรับสร้างบ้านในประเทศไทย สำหรับ Finnhouses";
  const finalSystem = baseSystem + frameContext;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: Math.min(maxTokens, 2000),
        system: finalSystem,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message ?? "Claude API error" }, { status: res.status });
    }

    const text = data.content?.[0]?.text ?? "เกิดข้อผิดพลาด กรุณาลองใหม่";
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: "ไม่สามารถติดต่อ Claude API ได้" }, { status: 500 });
  }
}

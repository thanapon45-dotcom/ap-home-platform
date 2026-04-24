import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat
 * General-purpose Claude API call — used by CRM tabs (Lead analysis, Market Q&A, Nurture plans)
 * Body: { system: string, prompt: string, maxTokens?: number }
 */
export async function POST(req: NextRequest) {
  const { system, prompt, maxTokens = 1200 } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY ไม่ได้ตั้งค่า" }, { status: 500 });
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: Math.min(maxTokens, 2000),
        system: system ?? "คุณเป็นผู้เชี่ยวชาญด้านอสังหาริมทรัพย์และธุรกิจรับสร้างบ้านในประเทศไทย สำหรับ Finnhouses",
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

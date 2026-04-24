import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, phone, area, budget } = await req.json();

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return NextResponse.json({ ok: false, error: "Telegram not configured" });
  }

  const text = `🏠 *Lead ใหม่ — Finnhouses Budget Tool*\n\n👤 ชื่อ: ${name}\n📱 โทร: ${phone}\n📐 พื้นที่: ${area} ตร.ม.\n💰 งบประมาณ: ${new Intl.NumberFormat("th-TH").format(budget)} บาท`;

  try {
    const res  = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("[Telegram] API error:", JSON.stringify(data));
      return NextResponse.json({ ok: false, error: data.description ?? "Unknown error" });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram] Fetch failed:", err);
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

// GET /api/telegram — ทดสอบ config ได้เลยจาก browser
export async function GET() {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({ ok: false, error: "Missing env vars" });
  }

  try {
    const res  = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: chatId, text: "🧪 Test — Finnhouses Platform", parse_mode: "Markdown" }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

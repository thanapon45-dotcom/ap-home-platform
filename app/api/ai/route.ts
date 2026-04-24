import { NextRequest, NextResponse } from "next/server";

const PLATFORM_PROMPTS: Record<string, string> = {
  fb_post:     "คุณเป็น copywriter ผู้เชี่ยวชาญด้านอสังหาริมทรัพย์ไทย เขียน Facebook Post ที่ดึงดูด มี hook แรง มี emoji เหมาะสม ยาว 150-250 คำ ลงท้ายด้วย CTA",
  tiktok:      "คุณเป็น TikTok script writer เขียน script สำหรับวิดีโอ 60-90 วินาที มี hook ใน 3 วิแรก แบ่งเป็น intro/body/CTA ใช้ภาษาพูดเป็นกันเอง",
  blog:        "คุณเป็น SEO content writer เขียนบทความ Blog ภาษาไทยที่ติด Google ความยาว 300-400 คำ มี heading structure ชัดเจน ใส่ keyword ธรรมชาติ",
  line:        "คุณเป็นผู้เชี่ยวชาญ LINE OA marketing เขียนข้อความสั้นกระชับ 80-120 คำ มี emoji เหมาะสม มี CTA ชัดเจน เหมาะกับการส่งผ่าน LINE",
  testimonial: "คุณเป็น copywriter เขียน testimonial script สำหรับลูกค้าจริง ฟังดูเป็นธรรมชาติ ไม่เกิน 150 คำ เล่าถึงประสบการณ์และความพึงพอใจ",
  ad_copy:     "คุณเป็น performance marketing copywriter เขียน Ad Copy สำหรับ Meta Ads มี headline 1-2 บรรทัด primary text 100-150 คำ CTA ชัดเจน",
};

export async function POST(req: NextRequest) {
  const { platform, style, tone, topic } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY ไม่ได้ตั้งค่าใน .env.local" }, { status: 500 });
  }

  const systemPrompt = PLATFORM_PROMPTS[platform] ?? PLATFORM_PROMPTS.fb_post;
  const userPrompt = `สร้าง content สำหรับแบรนด์ Finnhouses รับสร้างบ้านในไทย

หัวข้อบทความ: ${topic}
สไตล์บ้านที่เน้น: ${style}
โทนการเขียน: ${tone}

คำแนะนำ:
- เขียน content เกี่ยวกับหัวข้อ "${topic}" โดยเชื่อมโยงกับบ้านสไตล์ ${style}
- ใช้ชื่อแบรนด์ "Finnhouses" เท่านั้น ห้ามใช้ "AP Home"
- เหมาะกับกลุ่มเป้าหมายคนไทยที่สนใจสร้างบ้าน งบ 2-15 ล้านบาท
- เขียนให้สมจริงและมีความเชี่ยวชาญด้านการก่อสร้างบ้าน`;

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
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await res.json();
    const content = data.content?.[0]?.text ?? "เกิดข้อผิดพลาด กรุณาลองใหม่";
    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json({ error: "ไม่สามารถติดต่อ Anthropic API ได้" }, { status: 500 });
  }
}

// app/api/assistant/route.ts
//
// AP-Home Assistant — chat endpoint with Claude tool-calling.
// Wired to the REAL Hub routes verified in services/backend-hub/server.cjs
// (checked Aug 19, 2026 — see chat session for the grep output).
//
// Required env vars (Vercel):
//   ANTHROPIC_API_KEY
//   HUB_URL              (e.g. https://ap-home-platform-production.up.railway.app)
//   HUB_SECRET           (same value as Hub's HUB_SECRET — sent as x-hub-token)
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY (⚠️ must be the REAL service_role key — HANDOFF.md flags
//                         that .env.local currently has an anon key here. RLS on
//                         `leads` allows anon SELECT so reads will still work, but
//                         `market_insights` RLS status is unconfirmed — verify
//                         before relying on get_market_intel_recent.)

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const HUB_URL = process.env.HUB_URL || process.env.NEXT_PUBLIC_HUB_URL || "";
const HUB_SECRET = process.env.HUB_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `คุณคือ AP-Home Assistant ผู้ช่วยภายใน Dashboard ของ AP-Home Platform OS (แบรนด์ Finnhouses)
บริษัท: บจก.อาชิดา — ธุรกิจจริง 3 หน่วย: Fix & Flip/รีโนเวทเพื่อขาย (Unit 3, 60%) · ที่ปรึกษา/ตรวจสอบงานก่อสร้าง (Unit 4, 30%) · โบรกเกอร์ฝากขายบ้านและที่ดิน (Unit 2, 10%)
⚠️ บริษัท**เลิกรับสร้างบ้านใหม่แล้ว** (Unit 1 discontinued ตาม ADR-010) — ห้ามตอบว่า Finnhouses รับสร้างบ้านใหม่ให้ลูกค้าเองเด็ดขาด แม้ผู้ใช้จะถามนำก็ตาม

หน้าที่:
- ตอบคำถามเกี่ยวกับสถานะ platform, leads, market intel, QC, Deals และภาพรวมข้ามโมดูลโดยดึงข้อมูลจริงผ่าน tools เท่านั้น ห้ามเดาตัวเลขหรือสถานะ
- สำหรับคำถามที่ต้องใช้บริบทหลายฝ่าย ให้เรียก get_brains_context ก่อน แล้วจึงเจาะ tool เฉพาะโมดูลเมื่อจำเป็น
- สั่งงาน (run_fb_queue_next, run_blog_now) ได้เมื่อผู้ใช้ขอ แต่ระบบจะบังคับให้ผู้ใช้กด confirm เองก่อน execute จริงเสมอ — คุณแค่เรียก tool ตามปกติ ไม่ต้องกังวลเรื่อง gate

กฎการตอบ:
- ภาษาไทย กระชับ ตรงประเด็น ไม่ใส่ header ยาวเกินจำเป็น
- ถ้า tool คืนค่าว่างเปล่าหรือ error ให้บอกตามจริง เช่น "ไม่พบ lead ที่ตรงเงื่อนไข" ห้าม hallucinate
- ก่อนสั่ง run_blog_now ต้องมี keyword ชัดเจน ถ้าผู้ใช้ไม่ได้ระบุ ให้ถามก่อนเรียก tool
- ⚠️ ห้ามตอบด้วยข้อมูล/สมมติฐานที่มาจากความรู้ทั่วไปนอกระบบเด็ดขาด (เช่น เปอร์เซ็นต์ค่าธรรมเนียมโอน, ค่าคอมมิชชั่นทั่วไป, ราคาตลาดที่ไม่ได้มาจาก get_market_intel_recent) แม้จะดูสมเหตุสมผลก็ตาม — ถ้าคำนวณอะไรต้องใช้ตัวเลขจาก tools หรือจากที่ผู้ใช้ระบุมาเองในข้อความเท่านั้น ถ้าขาดตัวเลขที่จำเป็น ให้ถามผู้ใช้ก่อน อย่าเติมให้เองจากความรู้ทั่วไป และห้ามนำเสนอ deal ที่ผู้ใช้พิมพ์มาเองราวกับเป็นข้อมูลที่ยืนยันแล้วในระบบ — ต้องบอกชัดว่า "ตัวเลขนี้มาจากที่คุณระบุ ยังไม่มีบันทึกใน /deals จริง"`;

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic tool_use schema)
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: "get_dashboard_summary",
    description:
      "ดึงสถานะรวมของ Hub ผ่าน GET /api/state — FB engine, Blog engine, ความยาว queue, error ล่าสุด",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_leads",
    description: "ดึงรายการ leads จาก Supabase (ตาราง leads) filter ตาม stage หรือ business_unit ได้",
    input_schema: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          enum: ["new", "followup", "qualified", "closed"],
          description: "กรองตาม stage — ค่าจริงตาม CRM Kanban",
        },
        business_unit: { type: "string", description: "เช่น build, reno, list" },
        limit: { type: "number", description: "จำนวนสูงสุด (default 20)" },
      },
    },
  },
  {
    name: "get_market_intel_recent",
    description: "ดึง market insight ล่าสุดจาก Supabase (ตาราง market_insights) filter ตามพื้นที่ได้",
    input_schema: {
      type: "object",
      properties: {
        area: { type: "string", description: "ชื่อพื้นที่ภาษาไทย" },
        limit: { type: "number", description: "จำนวนสูงสุด (default 10)" },
      },
    },
  },
  {
    name: "get_qc_status",
    description: "ดึงประวัติ QC inspection ผ่าน GET /api/qc/list บน Hub — filter site/ช่วงวันที่ได้",
    input_schema: {
      type: "object",
      properties: {
        site_id: { type: "string" },
        from: { type: "string", description: "ISO date เช่น 2026-08-01" },
        to: { type: "string", description: "ISO date" },
        limit: { type: "number", description: "จำนวนสูงสุด (default 10)" },
      },
    },
  },
  {
    name: "get_brains_context",
    description:
      "ดึง Shared Business Context จาก /api/brains/context — รวม Market, Investment/Deals, QC และ Content ในคำขอเดียว. ใช้เป็นตัวอ่านข้ามโมดูลสำหรับคำถามเชิงภาพรวม/ความสัมพันธ์ข้ามฝ่าย และต้องถือข้อมูลว่างเป็นว่าง ห้ามสร้าง relationship ที่ไม่มีหลักฐาน",
    input_schema: {
      type: "object",
      properties: {
        area: { type: "string", description: "กรองตามทำเลเมื่อมีข้อมูล เช่น รังสิต, ลำลูกกา, ลาดหลุมแก้ว" },
        limit: { type: "number", description: "จำนวนสูงสุดต่อแหล่งข้อมูล (default 10)" },
      },
    },
  },
  {
    name: "get_deals",
    description:
      "ดึงรายการ Fix & Flip deals จริงจาก Supabase (ตาราง reno_deals, Business Unit 3 — 60% ของรายได้) — ต้องเรียก tool นี้ทุกครั้งที่ผู้ใช้ถามถึงดีล/ทรัพย์ที่กำลังพัฒนาอยู่ในระบบจริง ห้ามคำนวณ ROI จากตัวเลขที่ผู้ใช้พิมพ์มาเองโดยไม่เช็คก่อนว่ามีดีลนี้บันทึกไว้จริงหรือไม่ (ถ้าผู้ใช้แค่ถามสมมติฐาน/what-if ไม่ต้องเรียก)",
    input_schema: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          enum: ["evaluating", "renovating", "listed", "closed"],
          description: "กรองตาม stage ของ Kanban ใน /deals",
        },
        limit: { type: "number", description: "จำนวนสูงสุด (default 20)" },
      },
    },
  },
  {
    name: "run_fb_queue_next",
    description:
      "[WRITE] สั่งให้ Hub โพสต์ FB post ตัวถัดไปในคิว (POST /action/fb/queue/run-next) — ระบบจะขอ confirm จากผู้ใช้ก่อน execute จริงเสมอ",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "run_blog_now",
    description:
      "[WRITE] สั่งรัน Blog Runner ทันที (POST /action/blog/run) — ต้องมี keyword เสมอ ระบบจะขอ confirm ก่อน execute จริง",
    input_schema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "keyword บทความ — required" },
        category: {
          type: "number",
          description: "WP category id: 10=งบสร้างบ้าน 12=รับสร้างบ้าน 13=วัสดุก่อสร้าง 33=ที่ดิน 34=รีโนเวทเพื่อขาย 35=ราคารายโซน 36=ฝากขาย",
        },
        slot: { type: "string", enum: ["morning", "evening"] },
        visual_hint: {
          type: "string",
          enum: ["contemporary", "nordic", "luxury", "minimal", "loft", "modern tropical"],
        },
      },
      required: ["keyword"],
    },
  },
];

const WRITE_TOOLS = new Set(["run_fb_queue_next", "run_blog_now"]);

// ---------------------------------------------------------------------------
// Hub / Supabase helpers
// ---------------------------------------------------------------------------
async function hubGet(path: string) {
  const res = await fetch(`${HUB_URL}${path}`, {
    headers: { "x-hub-token": HUB_SECRET },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Hub GET ${path} failed: HTTP ${res.status}`);
  return res.json();
}

async function hubPost(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${HUB_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-token": HUB_SECRET },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Hub POST ${path} failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function supabaseSelect(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${table} failed: HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Execute a single tool call
// ---------------------------------------------------------------------------
async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "get_dashboard_summary": {
      const state = await hubGet("/api/state");
      return {
        fb: state.fb,
        blog: state.blog,
        fb_queue_length: Array.isArray(state.fb_queue) ? state.fb_queue.length : 0,
        blog_queue_length: Array.isArray(state.blog_queue) ? state.blog_queue.length : 0,
        system: state.system,
      };
    }
    case "get_leads": {
      const limit = Number(input.limit) || 20;
      let query = `select=id,name,phone,stage,business_unit,budget,urgency,lead_date&order=lead_date.desc&limit=${limit}`;
      if (input.stage) query += `&stage=eq.${encodeURIComponent(String(input.stage))}`;
      if (input.business_unit) query += `&business_unit=eq.${encodeURIComponent(String(input.business_unit))}`;
      return await supabaseSelect("leads", query);
    }
    case "get_market_intel_recent": {
      const limit = Number(input.limit) || 10;
      let query = `select=area,insight,category,confidence,source_type,created_at&order=created_at.desc&limit=${limit}`;
      if (input.area) query += `&area=eq.${encodeURIComponent(String(input.area))}`;
      return await supabaseSelect("market_insights", query);
    }
    case "get_qc_status": {
      const params = new URLSearchParams();
      if (input.site_id) params.set("site_id", String(input.site_id));
      if (input.from) params.set("from", String(input.from));
      if (input.to) params.set("to", String(input.to));
      params.set("limit", String(Number(input.limit) || 10));
      return await hubGet(`/api/qc/list?${params.toString()}`);
    }
    case "get_brains_context": {
      const params = new URLSearchParams();
      if (input.area) params.set("area", String(input.area));
      params.set("limit", String(Number(input.limit) || 10));
      const res = await fetch(`${APP_BASE_URL}/api/brains/context?${params.toString()}`, {
        headers: { "x-brains-source": "assistant" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Brains context failed: HTTP ${res.status}`);
      return res.json();
    }
    case "get_deals": {
      const limit = Number(input.limit) || 20;
      let query =
        `select=id,name,property_address,stage,purchase_price,reno_budget,reno_cost,list_price,sale_price,roi_pct,days_to_sell,created_at,updated_at` +
        `&order=created_at.desc&limit=${limit}`;
      if (input.stage) query += `&stage=eq.${encodeURIComponent(String(input.stage))}`;
      return await supabaseSelect("reno_deals", query);
    }
    case "run_fb_queue_next": {
      return await hubPost("/action/fb/queue/run-next");
    }
    case "run_blog_now": {
      if (!input.keyword) throw new Error("keyword is required");
      return await hubPost("/action/blog/run", {
        keyword: input.keyword,
        category: input.category ?? 13,
        slot: input.slot ?? "morning",
        visual_hint: input.visual_hint ?? "contemporary",
        source: "assistant-chat",
      });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Anthropic API call
// ---------------------------------------------------------------------------
async function callClaude(messages: unknown[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error: HTTP ${res.status} ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, confirmedToolUseId, cancelledToolUseId } = body as {
      messages: any[];
      confirmedToolUseId?: string;
      cancelledToolUseId?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    let currentMessages = [...messages];

    // Resuming after the user clicked Confirm on a pending write action:
    // execute the tool now, append its tool_result, then continue the loop below.
    if (confirmedToolUseId || cancelledToolUseId) {
      const targetId = confirmedToolUseId || cancelledToolUseId;
      const lastAssistant = [...currentMessages].reverse().find((m) => m.role === "assistant");
      const toolUse = lastAssistant?.content?.find(
        (b: any) => b.type === "tool_use" && b.id === targetId
      );
      if (!toolUse) {
        return NextResponse.json({ error: "tool_use_id not found in messages" }, { status: 400 });
      }

      let resultContent: unknown;
      if (cancelledToolUseId) {
        resultContent = { cancelled: true, reason: "ผู้ใช้ยกเลิกคำสั่งนี้" };
      } else {
        try {
          resultContent = await executeTool(toolUse.name, toolUse.input || {});
        } catch (e: any) {
          resultContent = { error: e.message };
        }
      }

      currentMessages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: targetId, content: JSON.stringify(resultContent) }],
      });
    }

    // Tool-use loop: auto-execute READ tools, pause on WRITE tools for confirmation.
    for (let i = 0; i < 6; i++) {
      const response = await callClaude(currentMessages);
      currentMessages.push({ role: "assistant", content: response.content });

      if (response.stop_reason !== "tool_use") {
        const textBlock = response.content.find((b: any) => b.type === "text");
        let text = textBlock?.text || "";
        const truncated = response.stop_reason === "max_tokens";
        if (truncated) {
          text += "\n\n⚠️ _คำตอบถูกตัดเพราะยาวเกิน max_tokens — พิมพ์ \"พูดต่อ\" เพื่อขอคำตอบส่วนที่เหลือ หรือถามให้เจาะจง/สั้นลง_";
        }
        return NextResponse.json({
          done: true,
          text,
          truncated,
          messages: currentMessages,
        });
      }

      const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use");
      const pendingWrite = toolUseBlocks.find((b: any) => WRITE_TOOLS.has(b.name));

      if (pendingWrite) {
        return NextResponse.json({
          done: false,
          needsConfirmation: true,
          toolUseId: pendingWrite.id,
          toolName: pendingWrite.name,
          toolInput: pendingWrite.input,
          messages: currentMessages,
        });
      }

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block: any) => {
          let result;
          try {
            result = await executeTool(block.name, block.input || {});
          } catch (e: any) {
            result = { error: e.message };
          }
          return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) };
        })
      );
      currentMessages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({ error: "Too many tool iterations" }, { status: 500 });
  } catch (e: any) {
    console.error("[assistant] error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}

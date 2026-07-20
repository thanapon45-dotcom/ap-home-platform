"use client";
import { useState, useEffect, useCallback } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL ?? "https://ap-home-platform-production.up.railway.app";
const BRAND = "Finnhouses";
const BRAND_FACTS = `ข้อมูลแบรนด์ที่ต้องใช้เท่านั้น (ห้ามปั้นตัวเลขหรือข้อมูลที่ไม่ได้ระบุ):
- ชื่อแบรนด์: Finnhouses
- ประเภทธุรกิจ: นายหน้าอสังหาริมทรัพย์ (ซื้อ-ขาย-ฝากขายบ้าน) และที่ปรึกษาตรวจสอบงานก่อสร้าง (Home Inspector) — ไม่ใช่บริษัทรับสร้างบ้าน/รับเหมาก่อสร้าง
- พื้นที่ให้บริการ: กรุงเทพฯ และปริมณฑล
- CTA ที่แนะนำ: "ลองดูผลงานที่ finnhouses.com" / "ทักมาปรึกษาเลย 0627946152" / "คอมเมนต์ไว้ได้เลย"
- เบอร์โทร: 0627946152
- เว็บไซต์: finnhouses.com
- ห้ามพูดถึง: ราคาเฉพาะเจาะจง, จำนวนปีประสบการณ์ที่ไม่รู้จริง, จังหวัดที่ไม่ใช่ กทม./ปริมณฑล, ห้ามพูดว่า Finnhouses เป็นผู้รับเหมา/ผู้สร้างบ้านเองเด็ดขาด
- Brand Philosophy: "ถ้าลูกค้าคือเพื่อน เราจะช่วยให้เขาตัดสินใจเรื่องบ้าน — ซื้อ ขาย หรือตรวจรับ — ได้อย่างมั่นใจที่สุด"
- ปรัชญา 3T:
  🔁 Transfer = ส่งมอบชัดเจน — ทุกขั้นตอนซื้อขาย/ตรวจสอบมี Checklist ชัดเจน อัปเดตความคืบหน้าสม่ำเสมอ เอกสารโปร่งใส ลูกค้ารู้ทุกขั้นตอนไม่ต้องเดา
  ⭐ Trust = สร้างความน่าเชื่อถือ — ทรัพย์จริง ตรวจสอบจริง ทีมมืออาชีพ ค่าบริการโปร่งใสไม่มีบวกซ้อน รีวิวจากลูกค้าจริง
  ❤️ Take Care = ดูแลต่อเนื่อง — ลูกค้าคือเพื่อน ไม่หายหน้าหลังปิดการขายหรือส่งรายงานตรวจ ใส่ใจรายละเอียด ดูแลหลังบริการจริง
- Buyer Emotional Reality: การตัดสินใจเรื่องบ้าน — ไม่ว่าจะซื้อ ขาย หรือตรวจสอบก่อนรับมอบ — คือหนึ่งในการตัดสินใจที่ยิ่งใหญ่ที่สุดในชีวิต ลูกค้าไม่ได้ซื้อแค่ "บ้าน" หรือ "บริการตรวจสอบ" เขาซื้อ "ความรู้สึกปลอดภัย" "ความมั่นใจ" และ "ชีวิตที่ดีขึ้น" content ที่โดนใจต้องทำให้เขารู้สึกว่า "Finnhouses เข้าใจฉัน" ไม่ใช่แค่ขายทรัพย์หรือขายบริการ
- Buyer Psychology: สื่อสาร Level 2–3 เท่านั้น (ห้ามแค่ feature Level 1):
  Level 1 Feature: "3 ห้องนอน วัสดุดี ทำเลดี" — คู่แข่งทุกรายพูดแบบนี้
  Level 2 Emotion: "ปลอดภัย มั่นใจ มั่นคง" — ทำให้เขารู้สึก
  Level 3 Identity: "คนที่ตรวจสอบให้รอบคอบก่อนซื้อ-ขาย-รับมอบ คือคนฉลาด ไม่เสี่ยงเอง" — ทำให้เขาเห็นตัวเอง
- Area Memory (ข้อมูลตลาดท้องถิ่นจากประสบการณ์จริง ห้ามเพิ่มเติมหรือแต่ง):
  📍 ลาดหลุมแก้ว: คนซื้อบ้านกลัวปัญหาน้ำ — พูดถึงระบบป้องกัน ยกพื้นสูง ระบบระบายน้ำ
  📍 รังสิต: Commuter demand สูง — เน้นระยะทางจากที่ทำงาน ใกล้นิคม/โรงงาน
  📍 คลองสาม: บ้าน Modern ปิดไว ต้องการน้อย — เน้นดีไซน์โดดเด่น ราคาแข่งขันได้
- Buyer Segments (2 กลุ่มหลัก ใช้กำหนด message ให้ตรงกลุ่ม):
  🏠 ซื้อ/ฝากขายบ้าน: กลัว "ขายไม่ออก/โดนกดราคา" หรือ "เดินทางไกล/ไม่ปลอดภัย" → ต้องการ "ขายได้ราคาดี รวดเร็ว" หรือ "ชีวิตประจำวันที่ดีขึ้น" → message: บ้านที่ดีคือบ้านที่ตอบชีวิตของคุณได้จริง
  🔍 ที่ปรึกษา/ตรวจสอบงานก่อสร้าง: กลัว "โดนผู้รับเหมาโกง/งานไม่ได้มาตรฐาน แต่ไม่รู้จะเช็คยังไง" → ต้องการ "ผู้เชี่ยวชาญช่วยตรวจสอบและยืนยันก่อนจ่ายเงิน/รับมอบ" → message: ให้มืออาชีพช่วยตรวจก่อนเซ็นรับ ไม่ต้องเดาเอง
- Buyer Intelligence (จากการสัมภาษณ์ลูกค้าจริง — ห้ามแต่งเพิ่ม):
  👤 Profile หลัก: อายุ 30-50, เจ้าของธุรกิจ/ผจก., รายได้ 100K+/เดือน, สมรส มีลูก รถ 2 คัน, ขยับขยาย (ไม่ใช่บ้านแรก)
  👩 Decision Maker: ภรรยาคือผู้ตัดสินใจจริง — content ต้องพูดกับภรรยา ไม่ใช่แค่สามี
  💬 Phrases ที่ได้ยินบ่อย: "ขอกลับไปคิดก่อน" / "กลัวงบบาน" / "เดี๋ยวคุยกับแฟนก่อน"
  ⚡ Conversion Triggers (เรียงตามความแรง):
    1. ขายบ้านเก่าได้แล้ว ต้องรีบย้าย — trigger แรงที่สุด
    2. ได้งานใหม่/ตำแหน่งสูงขึ้น
    3. อยากอยู่ใกล้แม่/ครอบครัว
    4. ใกล้ที่ทำงาน
  🚨 Ghost Signal: ลูกค้าไม่รับสาย + ไม่ตอบ Line = กำลังหาย ต้อง re-engage ด้วยเนื้อหาที่ address ความกลัวหลัก
  📱 Content ที่ได้ผลจริง: ภาพจริงของทรัพย์/รายงานตรวจสอบจริง, คุณภาพงาน, มีรปภ.กลางคืน
  ❌ Content ที่ไม่ได้ผล: Hard sell ทุกรูปแบบ
  🔑 คำที่สร้าง Trust: "Checklist", "QC", "ตรวจสอบตามมาตรฐาน", "มีคนรับผิดชอบ"
  😤 สิ่งที่ทำให้ลูกค้าโกรธจริงๆ: ติดต่อยาก ไม่มีคนรับผิดชอบ (ไม่ใช่ตัว defect)
  ❤️ สิ่งที่ลูกค้าประทับใจมากที่สุด: การดูแลต่อเนื่องหลังปิดงาน`;

// ── Keywords ─────────────────────────────────────────────────────────────────
const KEYWORDS = [
  // ── ซื้อ/ฝากขายบ้าน (Brokerage & Listing) ──
  "ฝากขายบ้านกับ Finnhouses ขายไวได้ราคาดี",
  "วิธีตั้งราคาบ้านให้ขายออกไว",
  "เอกสารที่ต้องเตรียมก่อนขายบ้าน",
  "ซื้อบ้านมือสองต้องเช็คอะไรบ้าง",
  "ขั้นตอนโอนกรรมสิทธิ์บ้าน ต้องเตรียมอะไรบ้าง",
  "จะซื้อหรือขายบ้านตอนนี้ดีไหม",
  "เลือกทำเลอย่างไรให้บ้านขายง่าย",
  "ทำไมบ้านหลังนี้ถึงยังขายไม่ออก",
  "ขายบ้านเก่า ย้ายบ้านใหม่ ต้องวางแผนอย่างไร",
  // ── ที่ปรึกษา/ตรวจสอบงานก่อสร้าง (Inspection & Consulting) ──
  "ทำไมต้องตรวจบ้านก่อนรับมอบ",
  "5 จุดที่ต้องเช็คก่อนรับมอบบ้านจากผู้รับเหมา",
  "จ้างผู้ตรวจบ้านอิสระ คุ้มค่าอย่างไร",
  "งานก่อสร้างไม่ได้มาตรฐาน สังเกตได้จากอะไร",
  "Checklist ตรวจบ้านก่อนโอนกรรมสิทธิ์",
  "ตรวจโครงสร้างบ้านต้องดูจุดไหนบ้าง",
  "จ้างผู้รับเหมาแล้วไม่มั่นใจ ควรทำอย่างไร",
  "ตรวจงานระหว่างก่อสร้าง vs ตรวจตอนรับมอบ ต่างกันอย่างไร",
  "ป้องกันงบบานปลายด้วยการตรวจสอบก่อนจ่ายเงิน",
  "รายงานตรวจบ้าน — สิ่งที่ควรได้จากผู้ตรวจมืออาชีพ",
  // ── 3T: Transfer (Process & Transparency) ─
  "เราตรวจสอบและส่งมอบงานอย่างไร — ทุกจุดมี Checklist",
  "ลูกค้าไม่ต้องเดา — อัปเดตความคืบหน้าให้ทุกขั้นตอน",
  "ค่าบริการโปร่งใส ไม่มีบวกซ้อน",
  // ── 3T: Trust (Credibility & Track Record) ───
  "เคสจริง ทรัพย์จริง — ผลงาน Finnhouses",
  "ทีมมืออาชีพที่ทำงานตรงเวลา",
  "รีวิวจากลูกค้าจริง — เสียงที่เราภูมิใจที่สุด",
  "ทำไมลูกค้าถึงไว้วางใจ Finnhouses",
  // ── 3T: Take Care (Relationship & After-Service) ─
  "ลูกค้าคือเพื่อน — เราไม่หายหน้าหลังปิดงาน",
  "หลังปิดการขาย/ส่งรายงานตรวจ เราดูแลคุณต่อเนื่อง",
  "บ้านของคุณ ชีวิตของคุณ — เราช่วยให้ตอบโจทย์จริงๆ",
  // ── Life Moments (ดึงใจ) ──────────────────────
  "บ้านหลังแรก — เริ่มต้นชีวิตใหม่ด้วยกัน",
  "เก็บเงินมาหลายปี เพื่อซื้อบ้านในฝัน",
  "ซื้อบ้านให้พ่อแม่อยู่สบายตอนแก่",
  "ตอบแทนบุญคุณพ่อแม่ด้วยบ้านหลังใหม่",
  "บ้านที่ลูกจะจำไปตลอด",
  "หาบ้านให้ครอบครัวก่อนลูกโต",
  "บ้านคือรากของชีวิต — เลือกให้มั่นคง",
];

const TONES = [
  {
    value: "casual",
    label: "เป็นกันเอง",
    emoji: "😊",
    color: "#f59e0b",
    desc: "อบอุ่น เหมือนเพื่อนแนะนำ",
    instruction: "เขียนแบบเพื่อนคุยกัน อบอุ่น เป็นกันเอง — เล่าเรื่องราวที่คนกำลังซื้อ-ขายบ้าน หรือกำลังตรวจสอบบ้านเข้าใจได้ทันที เชื่อมกับความรู้สึกหรือประสบการณ์จริงที่เขาอาจมีอยู่แล้ว ภาษาพูดธรรมชาติ เหมือนเพื่อนที่ผ่านเรื่องนี้มาแล้วแนะนำให้อย่างจริงใจ",
  },
  {
    value: "professional",
    label: "มืออาชีพ",
    emoji: "💼",
    color: "#6366f1",
    desc: "น่าเชื่อถือ ลดความกังวลลูกค้า",
    instruction: "เขียนในโทนมืออาชีพ น่าเชื่อถือ — สะท้อนว่าเราเข้าใจความกังวลของลูกค้าและมีคำตอบให้ ทำให้เขารู้สึกมั่นใจว่าตัดสินใจถูกแล้ว แสดงความเชี่ยวชาญผ่านข้อเท็จจริง ภาษากึ่งทางการ อ่านแล้วรู้สึกปลอดภัยที่จะไว้วางใจ",
  },
  {
    value: "educate",
    label: "Educate",
    emoji: "📚",
    color: "#22d3ee",
    desc: "ให้ความรู้ ช่วยตัดสินใจ",
    instruction: "ให้ความรู้ที่ทำให้ลูกค้า 'ตัดสินใจได้อย่างมั่นใจ' — อธิบายสิ่งที่เขาอาจกังวล สับสน หรือยังไม่รู้ ในแบบที่ทำให้รู้สึกว่า Finnhouses คือ 'คนที่เข้าใจ' และจะพาเขาผ่านขั้นตอนนี้ได้ ไม่แห้ง ยังมีอุณหภูมิ engage",
  },
  {
    value: "fun",
    label: "สนุกสนาน",
    emoji: "🎉",
    color: "#10b981",
    desc: "ขำขัน สดใส ดึง engagement",
    instruction: "เขียนแบบสนุกสนาน มีอารมณ์ขัน เบาสมอง — ใช้ภาษาวัยรุ่น emoji เยอะหน่อย แต่ยังแอบซ่อนความจริงใจที่ว่า Finnhouses ใส่ใจลูกค้าจริงๆ อยู่ใต้ความสนุกเสมอ เหมือนเพื่อนที่ฮาและแนะนำของดีๆ ให้",
  },
  {
    value: "heartfelt",
    label: "ดึงใจ",
    emoji: "💛",
    color: "#fbbf24",
    desc: "เล่าจากชีวิต กระทบอารมณ์",
    instruction: "เขียนจากมุมชีวิตจริงของคนที่กำลังตัดสินใจเรื่องบ้าน — ซื้อ ขาย หรือตรวจรับ — เริ่มจากช่วงเวลา ความรู้สึก หรือความฝันที่ buyer เข้าใจได้ทันที แล้วค่อย connect กับว่า Finnhouses เป็นคำตอบนั้นได้อย่างไร ภาษาอ่อนโยน ใกล้ชิด ให้คนอ่านแล้วรู้สึกว่า 'นี่คือเรื่องของฉัน'",
  },
  {
    value: "3t_story",
    label: "3T Story",
    emoji: "🏠",
    color: "#f97316",
    desc: "Transfer · Trust · Take Care",
    instruction: "เขียนในโทน 3T ของ Finnhouses — เล่าเรื่องจริงที่สะท้อนค่านิยมแบรนด์: โชว์ process ชัดเจน (Transfer) / สร้าง credibility จากหลักฐานจริง (Trust) / สะท้อนความใส่ใจดูแลลูกค้าเหมือนเพื่อน (Take Care) เลือก 1 มุมที่ตรงกับ keyword มากที่สุด แล้วเล่าให้เห็นภาพ ให้คนอ่านแล้วรู้สึกปลอดภัยที่จะไว้วางใจ Finnhouses",
  },
  {
    value: "positioned",
    label: "Positioned",
    emoji: "🎯",
    color: "#e879f9",
    desc: "ตรงกลุ่ม ตรงเวลา ตรงปัญหา",
    instruction: "เขียนสำหรับ buyer กลุ่มที่เลือกโดยตรง — ใช้ Segment + Awareness Level + Timing Signal กำหนด hook และ message ทั้งหมด ทำให้คนอ่านรู้สึกว่า 'นี่คือเรื่องของฉัน' ไม่ใช่ content ทั่วไปสำหรับทุกคน",
  },
];

const POST_TYPES = [
  { value: "fb_post",   label: "FB Post",    emoji: "📘" },
  { value: "fb_story",  label: "FB Story",   emoji: "📱" },
  { value: "instagram", label: "Instagram",  emoji: "📸" },
];

// ── Intelligence Framework Constants ─────────────────────────────────────────
const BUYER_SEGMENTS = [
  {
    value: "resale",
    label: "ซื้อ/ฝากขายบ้าน",
    emoji: "🏠",
    fear: "ขายไม่ออก/โดนกดราคา หรือเดินทางไกล/ไม่ปลอดภัย",
    need: "ขายได้ราคาดี รวดเร็ว หรือชีวิตประจำวันที่ดีขึ้น",
    key_message: "บ้านที่ดีคือบ้านที่ตอบชีวิตของคุณได้จริง",
    framed: [
      "เช้าส่งลูกโรงเรียน ตรงไปทำงาน เย็นกลับบ้านทัน — ชีวิตที่ไม่ต้องเสียเวลา",
      "ฝากขายกับเรา ทีมช่วยตั้งราคา ถ่ายภาพ และหาผู้ซื้อจริงให้ ไม่ต้องรอเดา",
    ],
  },
  {
    value: "inspection",
    label: "ที่ปรึกษา/ตรวจสอบงานก่อสร้าง",
    emoji: "🔍",
    fear: "โดนผู้รับเหมาโกง หรืองานไม่ได้มาตรฐาน แต่ไม่รู้จะเช็คยังไง",
    need: "ผู้เชี่ยวชาญช่วยตรวจสอบและยืนยันก่อนจ่ายเงิน/รับมอบ",
    key_message: "ให้มืออาชีพช่วยตรวจก่อนเซ็นรับ ไม่ต้องเดาเอง",
    framed: [
      "ก่อนโอนเงินงวดสุดท้าย ให้เราช่วยตรวจก่อน — เจอปัญหาทันจุด ไม่ต้องแก้ทีหลัง",
      "ไม่มีความรู้เรื่องก่อสร้างก็ไม่ต้องกังวล เรามี Checklist ตรวจให้ครบทุกจุด",
    ],
  },
];

const AWARENESS_LEVELS = [
  { value: "unaware",        label: "Unaware",        desc: "ยังไม่รู้ว่ากำลังมองหาบ้าน",        hook: "เปิดด้วย context ชีวิตทั่วไปที่เขาเข้าใจได้" },
  { value: "problem_aware",  label: "Problem Aware",  desc: "รู้ว่าอยากได้บ้าน ยังไม่รู้จะเริ่มอย่างไร", hook: "โชว์ว่าเข้าใจปัญหา แล้วบอกทางออก" },
  { value: "solution_aware", label: "Solution Aware", desc: "กำลังเปรียบเทียบตัวเลือก/นายหน้าอยู่",   hook: "แสดง differentiation ที่ชัดเจน" },
  { value: "most_aware",     label: "Most Aware",     desc: "พร้อมตัดสินใจ รอแค่ยืนยัน",           hook: "CTA ตรงๆ + social proof" },
];

const TIMING_SIGNALS = [
  { value: "none",       label: "ทั่วไป" },
  { value: "bonus",      label: "📈 โบนัสออก" },
  { value: "rate_up",    label: "💸 ดอกเบี้ยขึ้น" },
  { value: "rainy",      label: "🌧️ หน้าฝน" },
  { value: "new_year",   label: "🎊 ปีใหม่" },
  { value: "marriage",   label: "💍 เพิ่งแต่งงาน" },
  { value: "land_ready", label: "📐 มีที่ดินแล้ว" },
];

// ── Types ────────────────────────────────────────────────────────────────────
type ContentItem = {
  id: number;
  keyword: string;
  style: string;
  type: string;
  content: string;
  imageUrl: string;
  date: string;
  source: "keyword" | "blog";
  starred?: boolean;   // ⭐ เก็บเป็น Reference
  note?: string;       // "ทำไมถึงใช่?"
  segment?: string;    // กลุ่มลูกค้าที่ reference นี้ใช้ได้ดี (BUYER_SEGMENTS.value) — ว่าง = ใช้ได้ทั่วไป
};

type FbState = {
  status: string;
  queue: number;
  drafts: number;
  published: number;
  lastUpdate: string | null;
};

// ── API Helpers ───────────────────────────────────────────────────────────────
async function callClaude(system: string, prompt: string, model = "claude-haiku-4-5-20251001"): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, maxTokens: 2000, model }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Claude API error");
  return data.text ?? "";
}

// Step 1: Generate focused image concept via Claude (mirrors n8n's image_style_base step)
// Claude creates a 2-sentence concept specific to the keyword → sharper, less token waste
async function generateImageConcept(keyword: string): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "You are a real estate marketing visual director for Finnhouses, a property brokerage and home-inspection consultancy in Thailand. Write a focused 2-sentence image concept for a realistic marketing photo. Under 45 words. English only. Be specific and visual.",
        prompt: `Content topic: "${keyword}"\n\nWrite exactly 2 sentences:\n1. A specific, realistic real-estate scene (a house exterior/interior being viewed, listed, or inspected — no fabricated architectural claims)\n2. How the scene or mood connects to "${keyword}"`,
        maxTokens: 75,
      }),
    });
    const data = await res.json();
    return data.text ?? "";
  } catch { return ""; }
}

// Step 2: Send concept to image API — server auto-fallbacks OpenAI→Gemini on any error
async function generateImage(topic: string): Promise<string | null> {
  // Generate focused concept first (same pattern as n8n image_style_base node)
  const concept = await generateImageConcept(topic);
  console.log("[Image] concept:", concept);

  try {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, style: "realistic", concept, model: "openai" }),
    });
    const data = await res.json();
    if (data.ok && data.url) return data.url;
    console.warn("[Image] failed:", data.error);
  } catch (e) { console.error("[Image]:", e); }
  return null;
}

// ── Mini Components ───────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: ".08em",
      background: `${color}18`, color, border: `1px solid ${color}30`,
      borderRadius: 6, padding: "2px 8px",
    }}>{label}</span>
  );
}

// ── Tab: Keyword → FB Post ────────────────────────────────────────────────────
function KeywordTab({ onSave, starredRefs }: { onSave: (item: ContentItem) => void; starredRefs: ContentItem[] }) {
  const [keyword, setKeyword]   = useState(KEYWORDS[0]);
  const [custom, setCustom]     = useState("");
  const [tone, setTone]         = useState("casual");
  const [type, setType]         = useState("fb_post");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [genImg, setGenImg]     = useState(false);
  const [copied, setCopied]         = useState(false);
  const [savedOk, setSavedOk]       = useState(false);
  const [posting, setPosting]       = useState(false);
  const [postResult, setPostResult] = useState<"ok"|"error"|null>(null);
  // Positioned mode state
  const [buyerSeg, setBuyerSeg]   = useState("resale");
  const [awareness, setAwareness] = useState("problem_aware");
  const [timing, setTiming]       = useState("none");

  const finalKeyword  = custom.trim() || keyword;
  const selectedTone  = TONES.find(t => t.value === tone) ?? TONES[0];

  async function postToFacebook() {
    if (!result) return;
    setPosting(true); setPostResult(null);
    try {
      // Use Vercel server-side route — bypasses Hub & CORS issues
      // Send imageUrl only if it's a public https:// URL (OpenAI)
      // base64 data URLs are skipped — FB can't fetch them
      const publicImageUrl = imageUrl && imageUrl.startsWith("https://") ? imageUrl : undefined;
      const r = await fetch(`/api/fb/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: result, imageUrl: publicImageUrl, source: "ai-content" }),
      });
      const data = await r.json();
      setPostResult(r.ok && data.ok !== false ? "ok" : "error");
    } catch {
      setPostResult("error");
    } finally {
      setPosting(false);
    }
  }

  async function generate() {
    setLoading(true); setResult(""); setImageUrl("");
    const typeLabel  = POST_TYPES.find(t => t.value === type)?.label ?? type;
    const is3T          = tone === "3t_story";
    const isHeartfelt   = tone === "heartfelt";
    const isPositioned  = tone === "positioned";
    const selectedSeg   = BUYER_SEGMENTS.find(s => s.value === buyerSeg) ?? BUYER_SEGMENTS[0];
    const selectedAw    = AWARENESS_LEVELS.find(a => a.value === awareness) ?? AWARENESS_LEVELS[1];
    const selectedTiming = TIMING_SIGNALS.find(t => t.value === timing) ?? TIMING_SIGNALS[0];
    const isLifeMoment = [
      "บ้านหลังแรก", "เก็บเงินมา", "ซื้อบ้านให้พ่อแม่",
      "ตอบแทนบุญคุณ", "บ้านที่ลูก", "หาบ้านให้ครอบครัว", "บ้านคือราก",
    ].some(kw => finalKeyword.includes(kw));

    // Taste Library: ใช้เฉพาะ reference ที่ tag ตรงกลุ่มลูกค้าที่เลือกอยู่ก่อน
    // ถ้ายังไม่มีตัวไหน tag ตรงกลุ่มนี้เลย ค่อย fallback ไปใช้ทั้งหมด (เหมือนพฤติกรรมเดิม)
    const segMatchedRefs = starredRefs.filter(r => r.segment === buyerSeg);
    const refsToUse = segMatchedRefs.length > 0 ? segMatchedRefs : starredRefs;

    const system = `คุณเป็น copywriter ภาษาไทยของแบรนด์ ${BRAND} นายหน้าอสังหาริมทรัพย์และที่ปรึกษาตรวจสอบงานก่อสร้างในไทย
งานของคุณคือเขียน Facebook Post ภาษาไทยที่คนไทยอ่านแล้วรู้สึก "เป็นธรรมชาติ" ไม่ใช่แปลจากภาษาอื่น

โทนการเขียนที่ต้องใช้: ${selectedTone.label} (${selectedTone.desc})
${selectedTone.instruction}

${BRAND_FACTS}
${isPositioned ? `
── Positioned Content Guidelines (สำคัญมาก) ──
กลุ่มลูกค้าเป้าหมาย: ${selectedSeg.emoji} ${selectedSeg.label}
  • สิ่งที่เขากลัว: "${selectedSeg.fear}"
  • สิ่งที่เขาต้องการ: ${selectedSeg.need}
  • Key Message: "${selectedSeg.key_message}"
  • Framed Message ตัวอย่าง: "${selectedSeg.framed[0]}"

Awareness Level: ${selectedAw.label} — ${selectedAw.desc}
  • Hook approach: ${selectedAw.hook}

${selectedTiming.value !== "none" ? `Timing Signal: ${selectedTiming.label} — ใช้ timing นี้เป็น context ใน hook เช่น "ช่วง${selectedTiming.label}..." หรือ เชื่อมกับสถานการณ์นี้ให้เป็นธรรมชาติ` : "ไม่มี Timing Signal พิเศษ — เขียนได้ตลอดเวลา"}

สำคัญ: ห้ามเขียน content ทั่วไป — ต้องทำให้ ${selectedSeg.label} รู้สึกว่า "นี่คือเรื่องของฉัน"
` : ""}
${is3T ? `
── 3T Story Guidelines (สำคัญมาก) ──
เลือก 1 มุมจาก 3T ที่ตรงกับ keyword มากที่สุดแล้วเล่าให้เห็นภาพ:
🔁 Transfer → โชว์ขั้นตอนที่ชัดเจน เช่น "ก่อนปิดดีล เราเช็ค 12 จุด..." สร้างความมั่นใจว่าลูกค้าไม่ต้องเดา
⭐ Trust → เล่าจากหลักฐานจริง เช่น รีวิวลูกค้า, เคสจริง, ค่าบริการที่โปร่งใส อย่า over-promise
❤️ Take Care → เล่าเรื่องความสัมพันธ์ เช่น "หลังปิดงาน 6 เดือน..." แสดงว่าเราดูแลต่อเนื่องจริง
Hook ต้องมาจากประสบการณ์ที่คนกำลังซื้อ-ขายบ้าน หรือกำลังตรวจสอบบ้านเข้าใจได้ทันที` : ""}
${isHeartfelt ? `
── Heartfelt Guidelines (สำคัญมาก) ──
เปิดด้วย scene หรือช่วงเวลาจริงในชีวิต — ไม่ใช่คำถาม แต่เป็นภาพที่อ่านแล้วพยักหน้า เช่น:
  "ตอนนั่งดูบ้านเก่าที่บ้านแม่ ก็คิดขึ้นมาเองว่า..."
  "วันที่ลูกวิ่งเข้ามาถามว่า 'บ้านใหม่จะเสร็จเมื่อไหร่' ..."
จากนั้นค่อย connect กับ keyword — อย่า rush ไปหา feature ทันที ให้ผู้อ่านรู้สึกก่อนว่า "นี่คือเรื่องของฉัน"
ปิดด้วย brand philosophy ที่อบอุ่น "ถ้าลูกค้าคือเพื่อน เราจะช่วยให้เขาตัดสินใจเรื่องบ้านได้อย่างมั่นใจที่สุด"` : ""}

${refsToUse.length > 0 ? `
── ตัวอย่าง Reference ที่ "ใช่" สำหรับ Finnhouses ──
เรียนรู้ tone, pattern และความรู้สึกจากตัวอย่างเหล่านี้ — ห้ามคัดลอกคำต่อคำ แต่ให้ output มีคุณภาพในระดับเดียวกัน:
${refsToUse.slice(0, 2).map((r, i) => `[${i + 1}]${r.note ? ` — "${r.note}"` : ""}\n${r.content}`).join("\n\n")}
` : ""}
กฎภาษาที่เข้มงวด:
❌ ห้ามใช้สรรพนาม "ชั้น" "ผม" "ฉัน" — เขียนในนามแบรนด์ ไม่ใช่ตัวบุคคล
❌ ห้ามปั้นตัวเลข เช่น "10+ ปี" หรือสถิติที่ไม่รู้จริง
❌ ห้ามระบุจังหวัดที่ไม่ใช่ กทม./ปริมณฑล ใน hashtag หรือเนื้อหา
❌ ห้ามสร้างคำประสมผิดความหมาย ตรวจสอบทุกคำก่อนใส่
❌ ห้าม markdown headers เช่น **หัวข้อ:** หรือ ## ใดๆ ทั้งสิ้น
❌ ห้ามเส้น --- หรือ separator ใดๆ
❌ ห้ามเกิน 220 คำ
❌ ห้ามแสดงกระบวนการคิด ข้อแม้ ร่าง หรือผลการตรวจสอบในผลลัพธ์เด็ดขาด
✅ hashtag ต้องมีความหมายเชิงบวก ตรวจสอบทุกตัวก่อนใส่
${is3T ? `✅ 3T angle คือแกนหลัก — เลือก 1 มุม (Transfer/Trust/Take Care) แล้วเล่าให้ลึกและน่าเชื่อถือ`
  : isHeartfelt ? `✅ Emotion-first — ทำให้คนรู้สึกก่อน จึงค่อยบอกว่า Finnhouses คือคำตอบ`
  : isPositioned ? `✅ Positioned — เขียนตรงกลุ่ม ${selectedSeg.emoji}${selectedSeg.label} เท่านั้น ทุกประโยคต้องตอบ fear หรือ need ของกลุ่มนี้`
  : `✅ กลุ่มลูกค้า ${selectedSeg.emoji}${selectedSeg.label} คือแกนหลัก — ทุกประโยคควรเชื่อมกับสิ่งที่เขากลัว ("${selectedSeg.fear}") หรือสิ่งที่เขาต้องการ (${selectedSeg.need})`}
✅ ผลลัพธ์ = Facebook Post เท่านั้น ไม่มีส่วนอื่นใดทั้งสิ้น`;

    const prompt = isPositioned
      ? `เขียน ${typeLabel} ลง Facebook page ของ ${BRAND}

หัวข้อ: "${finalKeyword}"
กลุ่มลูกค้า: ${selectedSeg.emoji} ${selectedSeg.label}
Awareness Level: ${selectedAw.label} — ${selectedAw.desc}
${selectedTiming.value !== "none" ? `Timing Signal: ${selectedTiming.label}` : ""}

โครงสร้าง Positioned Content (เขียนต่อกัน ไม่มี label นำหน้า):
บรรทัด 1-2: Hook — ${selectedAw.hook}${selectedTiming.value !== "none" ? ` บวก context "${selectedTiming.label}" ให้เป็นธรรมชาติ` : ""}
2-3 บรรทัด: ตอบตรงๆ ว่า Finnhouses แก้ปัญหา "${selectedSeg.fear}" ได้อย่างไร — ใช้ message "${selectedSeg.key_message}" เป็นแกน เจาะจง ไม่ลอยๆ
1 ประโยคปิด: CTA${selectedAw.value === "most_aware" ? ' — "ทักมาปรึกษาเลย 0627946152" (พร้อมตัดสินใจแล้ว)' : ' — "ลองดูผลงานที่ finnhouses.com" (ยังต้องการข้อมูลเพิ่ม)'}
Hashtag 5-6 อัน: #Finnhouses #อสังหาริมทรัพย์ + hashtag ที่ตรงกับ ${selectedSeg.label}

ส่งเฉพาะ Facebook Post เท่านั้น — ไม่มีคำนำ ไม่มีหัวข้อ เริ่มต้นด้วย Hook โดยตรงเลย`

      : is3T
      ? `เขียน ${typeLabel} ลง Facebook page ของ ${BRAND}

หัวข้อ: "${finalKeyword}"
โทน: 3T Story — ${selectedTone.instruction}

โครงสร้าง 3T Story (เขียนต่อกัน ไม่มี label นำหน้า):
บรรทัด 1-2: Hook — ประโยคที่คนกำลังซื้อ-ขายบ้านหรือกำลังตรวจสอบบ้านอ่านแล้วพยักหน้า หรือเล่าจาก scene จริงในชีวิต ไม่จำเป็นต้องเป็นคำถาม
3-5 บรรทัด: เล่าเรื่อง 3T จากมุมที่เลือก (Transfer/Trust/Take Care) ให้เห็นภาพว่า Finnhouses ทำอะไร อย่างไร เพื่อลูกค้า — เจาะจง ไม่ลอยๆ รู้สึกได้ถึงความใส่ใจ
1-2 ประโยคปิด: เชื่อมกลับสู่ปรัชญา "ลูกค้าคือเพื่อน" + CTA ("ลองดูผลงานที่ finnhouses.com" หรือ "ทักมาปรึกษาเลย 0627946152")
Hashtag 6-8 อัน: #Finnhouses #อสังหาริมทรัพย์ #3T #Transfer หรือ #Trust หรือ #TakeCare #บ้านกรุงเทพ #ตรวจบ้าน

ส่งเฉพาะ Facebook Post เท่านั้น — ไม่มีคำนำ ไม่มีหัวข้อ ไม่มีข้อสังเกต เริ่มต้นด้วย Hook โดยตรงเลย`

      : isHeartfelt
      ? `เขียน ${typeLabel} ลง Facebook page ของ ${BRAND}

หัวข้อ: "${finalKeyword}"
โทน: ดึงใจ — emotion-first เล่าจากชีวิตจริง

โครงสร้าง Heartfelt (เขียนต่อกัน ไม่มี label นำหน้า):
บรรทัด 1-2: เปิดด้วย scene หรือช่วงเวลาในชีวิตที่คนกำลังซื้อ-ขาย-ตรวจบ้านรู้จักดี — ภาพหรือความรู้สึกที่อ่านแล้วพยักหน้า ไม่ใช่คำถาม${isLifeMoment ? "\n   (keyword นี้เกี่ยวกับ life moment — เปิดด้วยอารมณ์แบบนั้นโดยตรงเลย)" : ""}
2-3 บรรทัด: สะท้อนความรู้สึก ความฝัน หรือความกังวลที่ buyer อาจมี → แล้วค่อย connect กับว่า Finnhouses เป็น "คำตอบ" นั้นได้อย่างไร — เจาะจง ไม่ over-promise
1 ประโยคปิด: brand philosophy อ่อนโยน + CTA ที่เชิญชวน ไม่กดดัน (ใช้ "ลองดูผลงานที่ finnhouses.com" หรือ "ทักมาคุยก่อนเลยก็ได้ 0627946152")
Hashtag 5-6 อัน: #Finnhouses #อสังหาริมทรัพย์ + hashtag ที่สะท้อน life moment เช่น #บ้านหลังแรก #ครอบครัว #ความฝัน

ส่งเฉพาะ Facebook Post เท่านั้น — ไม่มีคำนำ ไม่มีหัวข้อ ไม่มีข้อสังเกต เริ่มต้นด้วย scene โดยตรงเลย`

      : `เขียน ${typeLabel} ลง Facebook page ของ ${BRAND}

หัวข้อ: "${finalKeyword}"
กลุ่มลูกค้า: ${selectedSeg.emoji} ${selectedSeg.label}
โทน: ${selectedTone.label} — ${selectedTone.instruction}

โครงสร้าง (เขียนต่อกัน ไม่มี label นำหน้า):
บรรทัด 1-2: Hook — เปิดด้วยความรู้สึก scene จากชีวิต หรือคำถามที่โดนใจคนที่กำลัง "${selectedSeg.fear}" (ใช้โทน ${selectedTone.label}) ให้คนอ่านแล้วรู้สึกว่า "นี่คือเรื่องของฉัน"
3-4 บรรทัด emoji: เชื่อมกับ "${finalKeyword}" โดยตรงว่า Finnhouses ช่วยตอบ "${selectedSeg.need}" ได้อย่างไร — เล่าให้เห็นภาพ ไม่แค่ list feature
1-2 ประโยคปิด: สะท้อนว่า Finnhouses เข้าใจลูกค้าจริงๆ + CTA (ใช้ "ลองดูผลงานที่ finnhouses.com" หรือ "ทักมาปรึกษาเลย 0627946152")
Hashtag 6-8 อัน: ทุกตัวต้องมีความหมายดี เช่น #Finnhouses #อสังหาริมทรัพย์ + hashtag ที่ตรงกับ ${selectedSeg.label}

ส่งเฉพาะ Facebook Post เท่านั้น — ไม่มีคำนำ ไม่มีหัวข้อ ไม่มีข้อสังเกต ไม่มีการตรวจสอบท้าย เริ่มต้นด้วย Hook โดยตรงเลย`;

    const text = await callClaude(system, prompt, "claude-sonnet-4-6").catch(e => `❌ Error: ${e.message}`);
    setResult(text);
    if (genImg && !text.startsWith("❌")) {
      const img = await generateImage(finalKeyword);
      if (img) setImageUrl(img);
    }
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    if (!result) return;
    onSave({
      id: Date.now(), keyword: finalKeyword, style: "—", type,
      content: result, imageUrl, date: new Date().toLocaleDateString("th-TH"),
      source: "keyword",
    });
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2000);
  }

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      {/* Left: Settings */}
      <Card style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#22d3ee", letterSpacing: ".1em" }}>⚙️ SETTINGS</div>

        {/* Buyer Segment — always visible, ใช้ได้กับทุกโทน (ไม่ผูกกับ Positioned อย่างเดียวแล้ว) */}
        <div>
          <div style={{ fontSize: 11, color: "#e879f9", fontWeight: 700, marginBottom: 8, letterSpacing: ".08em" }}>🎯 กลุ่มลูกค้าเป้าหมาย</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {BUYER_SEGMENTS.map(s => (
              <button key={s.value} onClick={() => setBuyerSeg(s.value)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left" as const,
                background: buyerSeg === s.value ? "rgba(232,121,249,.12)" : "rgba(255,255,255,.03)",
                color: buyerSeg === s.value ? "#e879f9" : "#64748b",
                border: buyerSeg === s.value ? "1px solid rgba(232,121,249,.35)" : "1px solid rgba(255,255,255,.06)",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{s.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>กลัว: {s.fear}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>
            {tone === "positioned"
              ? "ใช้กำหนด fear/need/message ในโทน Positioned โดยตรง"
              : "ใช้กรอง Reference จาก Taste Library ให้ตรงกลุ่มนี้เท่านั้น"}
          </div>
        </div>

        {/* Keyword */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>KEYWORD / หัวข้อ</div>
          <select value={keyword} onChange={e => setKeyword(e.target.value)} style={selectStyle}>
            {KEYWORDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "#475569", margin: "8px 0 4px" }}>หรือพิมพ์เอง:</div>
          <input
            value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="กรอก keyword..."
            style={{ ...inputStyle, marginBottom: 0 }}
          />
        </div>

        {/* Tone */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>โทนการเขียน</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {TONES.map(t => (
              <button key={t.value} onClick={() => setTone(t.value)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left",
                background: tone === t.value ? `${t.color}18` : "rgba(255,255,255,.03)",
                color: tone === t.value ? t.color : "#64748b",
                border: tone === t.value ? `1px solid ${t.color}40` : "1px solid rgba(255,255,255,.06)",
                transition: "all .15s",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{t.emoji}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{t.label}</span>
                  <span style={{ fontSize: 10, color: tone === t.value ? t.color : "#475569", marginLeft: 6 }}>{t.desc}</span>
                </div>
                {tone === t.value && <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.color, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>ประเภท Content</div>
          <div style={{ display: "flex", gap: 6 }}>
            {POST_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: type === t.value ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)",
                color: type === t.value ? "#818cf8" : "#64748b",
                border: type === t.value ? "1px solid rgba(99,102,241,.3)" : "1px solid rgba(255,255,255,.06)",
                textAlign: "center",
              }}>{t.emoji}<br />{t.label}</button>
            ))}
          </div>
        </div>

        {/* Positioned Mode: Awareness + Timing */}
        {tone === "positioned" && (
          <>
            <div style={{ borderTop: "1px solid rgba(232,121,249,.15)", paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "#e879f9", fontWeight: 700, marginBottom: 8, letterSpacing: ".08em" }}>🎯 POSITIONED MODE</div>

              {/* Awareness Level */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>Awareness Level</div>
                <select value={awareness} onChange={e => setAwareness(e.target.value)} style={selectStyle}>
                  {AWARENESS_LEVELS.map(a => (
                    <option key={a.value} value={a.value}>{a.label} — {a.desc}</option>
                  ))}
                </select>
              </div>

              {/* Timing Signal */}
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>Timing Signal</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {TIMING_SIGNALS.map(t => (
                    <button key={t.value} onClick={() => setTiming(t.value)} style={{
                      padding: "4px 9px", borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: "pointer",
                      background: timing === t.value ? "rgba(232,121,249,.12)" : "rgba(255,255,255,.04)",
                      color: timing === t.value ? "#e879f9" : "#64748b",
                      border: timing === t.value ? "1px solid rgba(232,121,249,.3)" : "1px solid rgba(255,255,255,.06)",
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Options */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={genImg} onChange={e => setGenImg(e.target.checked)} />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>สร้างภาพประกอบด้วย</span>
        </label>

        <button onClick={generate} disabled={loading} style={{
          background: loading ? "rgba(34,211,238,.05)" : "rgba(34,211,238,.12)",
          color: loading ? "#334155" : "#22d3ee",
          border: "1px solid rgba(34,211,238,.25)", borderRadius: 12,
          padding: "12px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "⏳ กำลังสร้าง..." : "✨ Generate"}
        </button>
      </Card>

      {/* Right: Result */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {result ? (
          <>
            <Card style={{ flex: 1, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Tag label={POST_TYPES.find(t => t.value === type)?.label ?? type} color="#818cf8" />
                  <Tag label={`${selectedTone.emoji} ${selectedTone.label}`} color={selectedTone.color} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={copy} style={btnStyle("#22d3ee")}>
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={save} style={btnStyle(savedOk ? "#10b981" : "#10b981")} disabled={savedOk}>
                    {savedOk ? "✅ Saved!" : "💾 Save"}
                  </button>
                  <button onClick={postToFacebook} disabled={posting} style={btnStyle(postResult === "ok" ? "#10b981" : postResult === "error" ? "#f43f5e" : "#6366f1")}>
                    {posting ? "⏳ กำลังโพสต์..." : postResult === "ok" ? "✅ โพสต์แล้ว!" : postResult === "error" ? "❌ ผิดพลาด" : "📤 Post to Facebook"}
                  </button>
                </div>
              </div>
              <pre style={{
                whiteSpace: "pre-wrap", fontSize: 13, color: "#e2e8f0",
                lineHeight: 1.7, margin: 0, fontFamily: "inherit",
              }}>{result}</pre>
            </Card>
            {imageUrl && (
              <Card style={{ padding: 12 }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag label="FB Post 1200×630" color="#22d3ee" />
                    <span style={{ fontSize: 10, color: "#475569" }}>อัตราส่วน 1.91:1</span>
                  </div>
                  <button
                    onClick={() => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = 1200; canvas.height = 630;
                        const ctx = canvas.getContext("2d")!;
                        // Center-crop to 1.91:1
                        const srcRatio = img.width / img.height;
                        const dstRatio = 1200 / 630;
                        let sx = 0, sy = 0, sw = img.width, sh = img.height;
                        if (srcRatio > dstRatio) { sw = img.height * dstRatio; sx = (img.width - sw) / 2; }
                        else { sh = img.width / dstRatio; sy = (img.height - sh) / 2; }
                        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1200, 630);
                        const a = document.createElement("a");
                        a.href = canvas.toDataURL("image/jpeg", 0.92);
                        a.download = `finnhouses_fb_${Date.now()}.jpg`;
                        a.click();
                      };
                      img.src = imageUrl;
                    }}
                    style={btnStyle("#10b981")}
                  >⬇️ ดาวน์โหลด FB</button>
                </div>
                {/* Image preview — FB 1.91:1 crop */}
                <div style={{ width: "100%", aspectRatio: "1.91/1", overflow: "hidden", borderRadius: 12, background: "#0a0f1e" }}>
                  <img
                    src={imageUrl}
                    alt="FB post image"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 6, textAlign: "center" }}>
                  Preview ขนาด FB Post · กดดาวน์โหลดเพื่อได้ไฟล์ 1200×630px
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 48 }}>✨</div>
            <div style={{ fontSize: 14, color: "#475569" }}>เลือก keyword และกด Generate</div>
            <div style={{ fontSize: 11, color: "#334155" }}>AI จะสร้าง FB content พร้อม hashtag ให้อัตโนมัติ</div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Tab: Blog → FB Post ───────────────────────────────────────────────────────
function BlogConvertTab({ onSave }: { onSave: (item: ContentItem) => void }) {
  const [blogText, setBlogText]   = useState("");
  const [type, setType]           = useState("fb_post");
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(false);
  const [result, setResult]       = useState("");
  const [copied, setCopied]       = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [blogImageUrl, setBlogImageUrl] = useState("");
  const [posting, setPosting]     = useState(false);
  const [postResult, setPostResult] = useState<"ok"|"error"|null>(null);

  const isUrl = blogText.trim().startsWith("http");

  async function fetchFromUrl() {
    setFetching(true); setFetchError(""); setBlogImageUrl("");
    try {
      const res = await fetch("/api/fetch-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blogText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFetchError(data.error ?? "ดึงบทความไม่สำเร็จ"); }
      else {
        setBlogText(data.text ?? "");
        if (data.imageUrl) setBlogImageUrl(data.imageUrl);
      }
    } catch { setFetchError("เกิดข้อผิดพลาด ลองใหม่"); }
    setFetching(false);
  }

  async function postToFacebook() {
    if (!result) return;
    setPosting(true); setPostResult(null);
    try {
      const publicImageUrl = blogImageUrl && blogImageUrl.startsWith("https://") ? blogImageUrl : undefined;
      const r = await fetch("/api/fb/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: result, imageUrl: publicImageUrl, source: "blog-convert" }),
      });
      const data = await r.json();
      setPostResult(r.ok && data.ok !== false ? "ok" : "error");
    } catch { setPostResult("error"); }
    finally { setPosting(false); }
  }

  async function convert() {
    if (!blogText.trim()) return;
    setLoading(true); setResult("");
    const typeLabel = POST_TYPES.find(t => t.value === type)?.label ?? type;
    const system = `คุณเป็น Social Media Editor ของแบรนด์ ${BRAND} งานของคุณคือแปลงบทความ SEO ยาวเป็น Facebook Post สั้นๆ ที่คนอยากอ่าน
เขียนเฉพาะ Facebook Post เท่านั้น — ไม่ใช่บทความ ไม่ใช่ summary ทางวิชาการ

กฎเหล็กด้านเนื้อหา (ห้ามละเมิด):
❌ ห้ามคัดลอกโครงสร้างของบทความต้นฉบับ (บทนำ เนื้อหา สรุป)
❌ ห้ามใช้ markdown headers (## หรือ **ชื่อหัวข้อ:**)
❌ ห้ามใช้เส้น --- แบ่งส่วน
❌ ห้ามเขียนยาวเกิน 220 คำ
✅ สกัดแค่ insight ที่น่าสนใจที่สุด 1-3 จุด มาเล่าใน FB style
✅ ภาษาพูดธรรมชาติ เหมือน real post

กฎเหล็กด้านภาษาไทย (สำคัญมาก):
❌ ห้ามใช้ประโยคที่ฟังดูเหมือนแปลจากภาษาอังกฤษ
❌ ห้ามสะกดผิด เช่น "ขออนุญาติ" → ต้องเป็น "ขออนุญาต", "กะเทาะ" ไม่ใช่ "กระเทาะ"
❌ ห้ามใช้คำที่ขัดแย้งในตัวเอง เช่น "พังนิดหน่อย" หรือ "เสียหายเล็กน้อย" เมื่อหมายถึงปัญหาใหญ่
❌ ห้าม hallucinate คำที่ไม่มีความหมายในภาษาไทย
❌ ห้ามซ้ำคำในประโยคเดียวกัน
✅ เขียนเหมือนคนไทยพูดคุยกันจริงๆ ใน Facebook — กระชับ ตรงประเด็น อ่านง่าย
✅ ตรวจสอบการสะกดคำทุกคำก่อน output`;
    const prompt = `บทความต้นฉบับ (อ่านเพื่อเข้าใจ แต่ห้ามเลียนแบบรูปแบบ):

${blogText.slice(0, 2000)}

---
ผลลัพธ์ที่ต้องการ: ${typeLabel} สำหรับ Facebook page ของ ${BRAND}

รูปแบบ Facebook Post:
• บรรทัด 1-2: Hook ดึงใจ — hook ที่ดึงดูดคนที่สนใจเรื่องนี้
• 3-4 bullet emoji: insight / จุดเด่นที่ถูก distill จากบทความ (แต่ละ bullet 1 บรรทัด)
• CTA: ต้องใช้ข้อความจากตัวอย่างด้านล่างเท่านั้น ห้ามแต่งเอง
  - "ลองดูผลงานที่ finnhouses.com" หรือ "ทักมาปรึกษาเลย 0627946152"
  - ❌ ห้ามใช้: "ลิงก์ใน Bio", "ปรึกษาฟรี", "ติดต่อเราวันนี้" โดยไม่ระบุช่องทาง
• Hashtag 5-7 อัน รวม #Finnhouses #อสังหาริมทรัพย์

เขียนเนื้อหาตรงๆ ห้ามใส่ label "Hook:" "CTA:" นำหน้า`;
    const text = await callClaude(system, prompt, "claude-sonnet-4-6").catch(e => `❌ Error: ${e.message}`);
    setResult(text);
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    if (!result || result.startsWith("❌")) return;
    onSave({
      id: Date.now(), keyword: "แปลงจาก Blog", style: "—", type,
      content: result, imageUrl: "", date: new Date().toLocaleDateString("th-TH"),
      source: "blog",
    });
  }

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      <Card style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", letterSpacing: ".1em" }}>📝 BLOG CONTENT</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>วาง URL หรือเนื้อหาบทความจาก finnhouses.com</div>
        <textarea
          value={blogText}
          onChange={e => { setBlogText(e.target.value); setFetchError(""); }}
          placeholder="วาง URL บทความ หรือวางเนื้อหาบทความตรง ๆ ก็ได้..."
          rows={12}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
        />

        {/* URL detected → show fetch button */}
        {isUrl && (
          <div>
            <button
              onClick={fetchFromUrl}
              disabled={fetching}
              style={{
                width: "100%", padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: fetching ? "not-allowed" : "pointer",
                background: fetching ? "rgba(255,255,255,.04)" : "rgba(34,211,238,.1)",
                color: fetching ? "#334155" : "#22d3ee",
                border: "1px solid rgba(34,211,238,.25)",
              }}
            >
              {fetching ? "⏳ กำลังดึงบทความ..." : "🔗 ดึงบทความจาก URL"}
            </button>
            {fetchError && (
              <div style={{ fontSize: 11, color: "#f43f5e", marginTop: 6, padding: "6px 10px", background: "rgba(244,63,94,.08)", borderRadius: 8 }}>
                ❌ {fetchError}
              </div>
            )}
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>แปลงเป็น</div>
          <div style={{ display: "flex", gap: 6 }}>
            {POST_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: type === t.value ? "rgba(167,139,250,.15)" : "rgba(255,255,255,.04)",
                color: type === t.value ? "#a78bfa" : "#64748b",
                border: type === t.value ? "1px solid rgba(167,139,250,.3)" : "1px solid rgba(255,255,255,.06)",
                textAlign: "center",
              }}>{t.emoji}<br />{t.label}</button>
            ))}
          </div>
        </div>
        <button onClick={convert} disabled={loading || !blogText.trim()} style={{
          background: loading ? "rgba(167,139,250,.05)" : "rgba(167,139,250,.12)",
          color: loading ? "#334155" : "#a78bfa",
          border: "1px solid rgba(167,139,250,.25)", borderRadius: 12,
          padding: "12px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "⏳ กำลังแปลง..." : "🔄 แปลงเป็น FB Post"}
        </button>
      </Card>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {result ? (
          <>
            <Card style={{ flex: 1, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Tag label={`Blog → ${POST_TYPES.find(t => t.value === type)?.label}`} color="#a78bfa" />
                  {blogImageUrl && <Tag label="🖼️ มีรูป" color="#10b981" />}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={copy} style={btnStyle("#22d3ee")}>{copied ? "✅ Copied!" : "📋 Copy"}</button>
                  <button onClick={save} style={btnStyle("#10b981")}>💾 Save</button>
                  <button onClick={postToFacebook} disabled={posting} style={btnStyle(postResult === "ok" ? "#10b981" : postResult === "error" ? "#f43f5e" : "#6366f1")}>
                    {posting ? "⏳ กำลังโพสต์..." : postResult === "ok" ? "✅ โพสต์แล้ว!" : postResult === "error" ? "❌ ผิดพลาด" : "📤 Post to Facebook"}
                  </button>
                </div>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, margin: 0, fontFamily: "inherit" }}>{result}</pre>
            </Card>
            {blogImageUrl && (
              <Card style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag label="Featured Image จาก Blog" color="#a78bfa" />
                    <span style={{ fontSize: 10, color: "#475569" }}>จะโพสต์พร้อมกับข้อความ</span>
                  </div>
                </div>
                <div style={{ width: "100%", aspectRatio: "1.91/1", overflow: "hidden", borderRadius: 12, background: "#0a0f1e" }}>
                  <img
                    src={blogImageUrl}
                    alt="Blog featured image"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 6, textAlign: "center" }}>
                  กด "Post to Facebook" เพื่อโพสต์รูปนี้พร้อม caption บน FB Page
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 48 }}>📰</div>
            <div style={{ fontSize: 14, color: "#475569" }}>วางบทความแล้วกด "แปลงเป็น FB Post"</div>
            <div style={{ fontSize: 11, color: "#334155" }}>AI จะสรุปและปรับเป็น format FB ให้อัตโนมัติ</div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Reusable copy button with feedback ───────────────────────────────────────
function CopyBtn({ text, label = "📋 Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  function doCopy() {
    // Try modern clipboard API first
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setOk(true); setTimeout(() => setOk(false), 2000);
      }).catch(() => fallback());
    } else { fallback(); }
  }
  function fallback() {
    // execCommand fallback for browsers blocking clipboard API
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed"; el.style.opacity = "0";
    document.body.appendChild(el); el.select();
    try { document.execCommand("copy"); setOk(true); setTimeout(() => setOk(false), 2000); } catch {}
    document.body.removeChild(el);
  }
  return (
    <button onClick={doCopy} style={{ marginTop: 8, background: "none", border: "none", color: ok ? "#10b981" : "#22d3ee", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
      {ok ? "✅ Copied!" : label}
    </button>
  );
}

// ── Tab: Listing → FB Post ────────────────────────────────────────────────────
type WpProperty = {
  wp_id: number;
  title: string;
  link: string;
  date: string;
  excerpt: string;
  featured_image: string;
  price: number | null;
  property_type: string;
  location: string;
  zone: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  land_sqm: number | null;
};

function formatPriceTh(val: number | null) {
  if (!val) return "—";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} ล้าน ฿`;
  return `${val.toLocaleString("th-TH")} ฿`;
}

function ListingTab({ onSave }: { onSave: (item: ContentItem) => void }) {
  const [properties, setProperties] = useState<WpProperty[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<WpProperty | null>(null);
  const [type, setType] = useState("fb_post");
  const [awareness, setAwareness] = useState("problem_aware");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<"ok" | "error" | null>(null);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    fetch("/api/property/list")
      .then(r => r.json())
      .then(d => {
        if (d.ok) setProperties(d.properties ?? []);
        else setListError(d.error ?? "ดึงข้อมูลไม่สำเร็จ");
      })
      .catch(() => setListError("เกิดข้อผิดพลาด ลองรีโหลดหน้า"))
      .finally(() => setLoadingList(false));
  }, []);

  async function generate() {
    if (!selected) return;
    setLoading(true); setResult(""); setPostResult(null);
    const typeLabel = POST_TYPES.find(t => t.value === type)?.label ?? type;
    const resaleSeg  = BUYER_SEGMENTS.find(s => s.value === "resale")!;
    const selectedAw = AWARENESS_LEVELS.find(a => a.value === awareness) ?? AWARENESS_LEVELS[1];
    const details = [
      `ประเภท: ${selected.property_type || "บ้าน"}`,
      `ทำเล: ${selected.location || "—"}${selected.zone ? ` (${selected.zone})` : ""}`,
      `ราคา: ${formatPriceTh(selected.price)}`,
      selected.bedrooms  ? `ห้องนอน: ${selected.bedrooms} ห้อง`      : "",
      selected.bathrooms ? `ห้องน้ำ: ${selected.bathrooms} ห้อง`     : "",
      selected.area_sqm  ? `พื้นที่ใช้สอย: ${selected.area_sqm} ตร.ม.` : "",
      selected.land_sqm  ? `ที่ดิน: ${selected.land_sqm} ตร.ว.`      : "",
      selected.excerpt   ? `รายละเอียด: ${selected.excerpt.slice(0, 300)}` : "",
    ].filter(Boolean).join("\n");

    const system = `คุณเป็น Social Media Editor ของแบรนด์ ${BRAND} (โบรกเกอร์อสังหาริมทรัพย์และที่ปรึกษาตรวจสอบงานก่อสร้าง)
เขียน ${typeLabel} โปรโมททรัพย์มือสองชิ้นนี้ให้น่าสนใจและขายออกได้จริง

${BRAND_FACTS}

── กลุ่มลูกค้าเป้าหมาย: บ้านมือสอง / Listing (สำคัญมาก — ห้ามเขียนแบบทั่วไป) ──
${resaleSeg.emoji} ${resaleSeg.label}
  • สิ่งที่เขากลัว: "${resaleSeg.fear}"
  • สิ่งที่เขาต้องการ: ${resaleSeg.need}
  • Key Message: "${resaleSeg.key_message}"
  • Framed Message ตัวอย่าง (แนวทาง ห้ามคัดลอกคำต่อคำ): "${resaleSeg.framed[0]}"

Awareness Level: ${selectedAw.label} — ${selectedAw.desc}
  • Hook approach: ${selectedAw.hook}

สำคัญ: ต้องเขียนระดับ "ความรู้สึก/ชีวิตประจำวัน" (Level 2-3) ไม่ใช่แค่ list feature (Level 1) — ทำให้คนอ่านรู้สึกว่า "บ้านหลังนี้ตอบชีวิตของฉันได้จริง" ก่อนจะโชว์ราคา/สเปค

โครงสร้างบังคับ (เรียงตามนี้เป๊ะ ห้ามสลับ):
1. **บรรทัดเปิด (1 ประโยคเดียวเท่านั้น)** — บรรยายฉาก/ความรู้สึกในชีวิตประจำวันที่มาจาก fear/need ข้างต้นโดยตรง เช่นรูปแบบ "${resaleSeg.framed[0]}" (ห้ามคัดลอกคำต่อคำ ให้ปรับเข้ากับทำเลจริงของทรัพย์นี้)
   ❌ บรรทัดนี้ห้ามมีตัวเลขราคา, ห้ามมีคำว่า "งบ", "ราคาเพียง", "บาท", ห้ามมี emoji แบบ bullet-list, ห้ามใช้คำ hype เช่น "หายากมาก" "รีบเลย" "อย่าให้คนอื่นได้ก่อน"
2. บรรทัดที่ 2 — เชื่อมจากฉากในบรรทัด 1 เข้าสู่ทรัพย์นี้จริงๆ (พูดถึงทำเล/ตัวบ้านสั้นๆ)
3. หลังจากนั้นค่อยเป็น bullet จุดเด่น 3-4 ข้อ (emoji) รวมราคา/ห้องนอน/พื้นที่ ตามข้อมูลจริง
4. CTA: ใช้ลิงก์ทรัพย์นี้โดยตรง — "ดูรายละเอียดเพิ่มเติมที่ [PROPERTY_URL]" หรือ "ทักมาปรึกษาเลย 0627946152"
5. Hashtag 5-7 อัน รวม #Finnhouses #ขายบ้าน #บ้านมือสอง

กฎเหล็ก:
❌ ห้าม hallucinate ข้อมูลที่ไม่มีในรายละเอียดทรัพย์ (ราคา/ห้องนอน/ทำเล/พื้นที่ ต้องตรงกับข้อมูลจริงที่ให้มาเท่านั้น)
❌ ประเภทบ้านต้องตรงกับ "ประเภท: ${selected.property_type || "บ้าน"}" ที่ระบุมาเป๊ะๆ ห้ามเปลี่ยนเป็นประเภทอื่น (เช่น ถ้าเป็นทาวน์เฮ้าส์/บ้านแฝด ห้ามเขียนว่า "บ้านเดี่ยว" เด็ดขาด — คำว่า "บ้านเดี่ยว" ใช้ได้เฉพาะเมื่อประเภทระบุว่าเป็นบ้านเดี่ยวจริงเท่านั้น)
❌ ห้ามเขียนยาวเกิน 200 คำ
❌ ห้ามใช้ "ปรึกษาฟรี" หรือ "ลิงก์ใน Bio"
✅ เขียน FB style กระชับ ดึงใจ ภาษาพูดธรรมชาติ`;

    const decodedLink = (() => { try { return decodeURIComponent(selected.link ?? ""); } catch { return selected.link ?? ""; } })();

    const prompt = `รายละเอียดทรัพย์:
ชื่อ: "${selected.title.replace(/<[^>]+>/g, "")}"
${details}
ลิงก์ทรัพย์: ${decodedLink}

เขียน ${typeLabel} สำหรับ Facebook page ของ ${BRAND} ตามโครงสร้างบังคับ 5 ข้อที่กำหนดไว้ใน system prompt เป๊ะๆ
ทำเลจริงของทรัพย์นี้: ${selected.location || "—"}${selected.zone ? ` (${selected.zone})` : ""} — ใช้ทำเลนี้ในการปรับฉาก/ความรู้สึกของบรรทัดเปิด ไม่ใช่ทำเลสมมติ
ลิงก์ CTA: ${decodedLink}

เขียนตรงๆ ห้ามใส่ label "1." "2." "Hook:" หรือ "CTA:" นำหน้าแต่ละส่วน — ให้อ่านลื่นเหมือนโพสต์จริง`;

    const text = await callClaude(system, prompt, "claude-sonnet-4-6").catch(e => `❌ Error: ${e.message}`);
    setResult(text);
    setLoading(false);
  }

  async function postToFacebook() {
    if (!result) return;
    setPosting(true); setPostResult(null); setPostError("");
    try {
      const imageUrl = selected?.featured_image?.startsWith("https://") ? selected.featured_image : undefined;
      const r = await fetch("/api/fb/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: result, imageUrl, source: "listing" }),
      });
      const data = await r.json();
      const ok = r.ok && data.ok !== false;
      setPostResult(ok ? "ok" : "error");
      if (!ok) setPostError(data.error ?? `HTTP ${r.status}`);
    } catch (e) {
      setPostResult("error");
      setPostError(e instanceof Error ? e.message : "network error");
    }
    finally { setPosting(false); }
  }

  function copy() { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  function save() {
    if (!result || result.startsWith("❌")) return;
    onSave({
      id: Date.now(), keyword: selected?.title.replace(/<[^>]+>/g, "") ?? "Listing",
      style: "—", type, content: result,
      imageUrl: selected?.featured_image ?? "",
      date: new Date().toLocaleDateString("th-TH"), source: "blog",
    });
  }

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 210px)", minHeight: 420 }}>
      {/* Left — Property List */}
      <Card style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden", height: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#fb7185", letterSpacing: ".1em" }}>🏠 PROPERTY LISTINGS</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>เลือกทรัพย์ที่อยากโพสต์ขาย</div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
          {loadingList ? (
            <div style={{ textAlign: "center", paddingTop: 40, color: "#334155", fontSize: 13 }}>⏳ กำลังโหลด...</div>
          ) : listError ? (
            <div style={{ color: "#f43f5e", fontSize: 12, padding: "8px 12px", background: "rgba(244,63,94,.08)", borderRadius: 8 }}>❌ {listError}</div>
          ) : properties.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 40, color: "#334155", fontSize: 13 }}>ยังไม่มีทรัพย์ที่ publish บนเว็บ</div>
          ) : properties.map(p => (
            <button
              key={p.wp_id}
              onClick={() => { setSelected(p); setResult(""); setPostResult(null); }}
              style={{
                textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer", width: "100%",
                background: selected?.wp_id === p.wp_id ? "rgba(251,113,133,.1)" : "rgba(255,255,255,.03)",
                border: selected?.wp_id === p.wp_id ? "1px solid rgba(251,113,133,.35)" : "1px solid rgba(255,255,255,.06)",
              }}
            >
              {p.featured_image && (
                <img src={p.featured_image} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, marginBottom: 8, display: "block" }} />
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.4, marginBottom: 4 }}
                dangerouslySetInnerHTML={{ __html: p.title }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.price   && <span style={{ fontSize: 10, color: "#fb7185", fontWeight: 700 }}>{formatPriceTh(p.price)}</span>}
                {p.location && <span style={{ fontSize: 10, color: "#64748b" }}>📍 {p.location}</span>}
                {p.bedrooms && <span style={{ fontSize: 10, color: "#64748b" }}>🛏 {p.bedrooms}</span>}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Right — Generate + Result */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", minHeight: 0 }}>
        {selected ? (
          <>
            <Card style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fb7185", flexShrink: 0 }}>📝</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  dangerouslySetInnerHTML={{ __html: selected.title }} />
                {selected.price && <span style={{ fontSize: 11, color: "#fb7185", fontWeight: 700, flexShrink: 0 }}>{formatPriceTh(selected.price)}</span>}
                {selected.location && <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>📍 {selected.location}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>แปลงเป็น</div>
                {POST_TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: type === t.value ? "rgba(251,113,133,.15)" : "rgba(255,255,255,.04)",
                    color: type === t.value ? "#fb7185" : "#64748b",
                    border: type === t.value ? "1px solid rgba(251,113,133,.3)" : "1px solid rgba(255,255,255,.06)",
                  }}>{t.emoji} {t.label}</button>
                ))}
                <div style={{ width: 1, height: 16, background: "rgba(255,255,255,.08)", margin: "0 2px" }} />
                <div style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>ลูกค้ารู้ตัวแค่ไหน</div>
                {AWARENESS_LEVELS.map(a => (
                  <button key={a.value} onClick={() => setAwareness(a.value)} title={a.desc} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: awareness === a.value ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)",
                    color: awareness === a.value ? "#818cf8" : "#64748b",
                    border: awareness === a.value ? "1px solid rgba(99,102,241,.3)" : "1px solid rgba(255,255,255,.06)",
                  }}>{a.label}</button>
                ))}
                <button onClick={generate} disabled={loading} style={{
                  marginLeft: "auto", background: loading ? "rgba(251,113,133,.05)" : "rgba(251,113,133,.12)",
                  color: loading ? "#334155" : "#fb7185",
                  border: "1px solid rgba(251,113,133,.25)", borderRadius: 8,
                  padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                }}>
                  {loading ? "⏳ กำลังสร้าง..." : "✨ สร้าง FB Post"}
                </button>
              </div>
            </Card>
            {result && (
              <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag label={`🏠 Listing → ${POST_TYPES.find(t => t.value === type)?.label}`} color="#fb7185" />
                    {selected.featured_image && <Tag label="🖼️ มีรูป" color="#10b981" />}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={copy} style={btnStyle("#22d3ee")}>{copied ? "✅ Copied!" : "📋 Copy"}</button>
                    <button onClick={save} style={btnStyle("#10b981")}>💾 Save</button>
                    <button onClick={postToFacebook} disabled={posting} style={btnStyle(postResult === "ok" ? "#10b981" : postResult === "error" ? "#f43f5e" : "#6366f1")}>
                      {posting ? "⏳..." : postResult === "ok" ? "✅ โพสต์แล้ว!" : postResult === "error" ? "❌ ผิดพลาด" : "📤 Post to Facebook"}
                    </button>
                  </div>
                </div>
                {postResult === "error" && postError && (
                  <div style={{ fontSize: 12, color: "#f43f5e", marginBottom: 10, wordBreak: "break-word" }}>
                    {postError}
                  </div>
                )}
                <textarea
                  value={result}
                  onChange={e => setResult(e.target.value)}
                  style={{
                    flex: 1, minHeight: 280, width: "100%", resize: "vertical",
                    background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#e2e8f0",
                    lineHeight: 1.8, fontFamily: "inherit", overflowY: "auto",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </Card>
            )}
          </>
        ) : (
          <Card style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 48 }}>🏠</div>
            <div style={{ fontSize: 14, color: "#475569" }}>เลือกทรัพย์จากรายการทางซ้าย</div>
            <div style={{ fontSize: 11, color: "#334155" }}>AI จะสร้าง FB Post พร้อมรูปให้อัตโนมัติ</div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Tab: Saved & FB Status ────────────────────────────────────────────────────
function HistoryTab({ saved, onDelete, onStar }: {
  saved: ContentItem[];
  onDelete: (id: number) => void;
  onStar: (id: number, starred: boolean, note?: string, segment?: string) => void;
}) {
  const [fb, setFb] = useState<FbState>({ status: "unknown", queue: 0, drafts: 0, published: 0, lastUpdate: null });
  const [starringId, setStarringId] = useState<number | null>(null);
  const [starNote, setStarNote]     = useState("");
  const [starSeg, setStarSeg]       = useState("");

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/blog/state", { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return;
      const d = await r.json();
      if (d.fb) setFb(d.fb);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { poll(); const t = setInterval(poll, 6000); return () => clearInterval(t); }, [poll]);

  const statusColor: Record<string, string> = {
    idle: "#64748b", running: "#f59e0b", published: "#10b981", failed: "#f43f5e", unknown: "#334155",
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* FB Engine Status */}
      <Card style={{ width: 260, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#22d3ee", letterSpacing: ".1em", marginBottom: 16 }}>📡 FB ENGINE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Status</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[fb.status] ?? "#64748b", textTransform: "uppercase" }}>{fb.status}</span>
          </div>
          {[
            { label: "Queue",     value: fb.queue,     color: "#f59e0b" },
            { label: "Drafts",    value: fb.drafts,    color: "#818cf8" },
            { label: "Published", value: fb.published, color: "#10b981" },
          ].map(r => (
            <div key={r.label} style={{ background: `${r.color}0f`, border: `1px solid ${r.color}20`, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>{r.label}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: r.color }}>{r.value}</span>
            </div>
          ))}
          {fb.lastUpdate && (
            <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 4 }}>
              อัปเดต: {new Date(fb.lastUpdate).toLocaleString("th-TH")}
            </div>
          )}
        </div>
      </Card>

      {/* Saved Content List */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em" }}>
            💾 SAVED CONTENT ({saved.length})
          </div>
          {saved.some(i => i.starred) && (
            <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.25)", borderRadius: 20, padding: "3px 10px" }}>
              ⭐ {saved.filter(i => i.starred).length} Reference
            </span>
          )}
        </div>
        {saved.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, color: "#475569" }}>ยังไม่มี content ที่ save ไว้</div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...saved].sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0)).map(item => (
              <Card key={item.id} style={{
                padding: 14,
                borderLeft: item.starred ? "3px solid #fbbf24" : undefined,
                background: item.starred ? "rgba(251,191,36,.04)" : undefined,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {item.starred && <span style={{ fontSize: 11 }}>⭐</span>}
                    <Tag label={item.source === "blog" ? "Blog→FB" : "Keyword"} color={item.source === "blog" ? "#a78bfa" : "#22d3ee"} />
                    <Tag label={POST_TYPES.find(t => t.value === item.type)?.label ?? item.type} color="#818cf8" />
                    {item.starred && item.segment && (
                      <Tag label={BUYER_SEGMENTS.find(s => s.value === item.segment)?.label ?? item.segment} color="#e879f9" />
                    )}
                    <span style={{ fontSize: 11, color: "#334155" }}>{item.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {/* Star toggle */}
                    <button
                      onClick={() => {
                        if (item.starred) {
                          onStar(item.id, false);
                          if (starringId === item.id) setStarringId(null);
                        } else {
                          setStarringId(item.id);
                          setStarNote("");
                          setStarSeg("");
                        }
                      }}
                      title={item.starred ? "ยกเลิก Reference" : "เก็บเป็น Reference"}
                      style={{
                        background: "none", border: "none", cursor: "pointer", fontSize: 15,
                        color: item.starred ? "#fbbf24" : "#f1f5f9",
                        opacity: item.starred ? 1 : 1,
                      }}
                    >{item.starred ? "⭐" : "☆"}</button>
                    <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>{item.keyword}</div>

                {/* Note display */}
                {item.starred && item.note && (
                  <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 6, fontStyle: "italic", opacity: 0.8 }}>
                    "{item.note}"
                  </div>
                )}

                <pre style={{ fontSize: 11, color: "#94a3b8", margin: 0, whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden", fontFamily: "inherit" }}>
                  {item.content.slice(0, 200)}{item.content.length > 200 ? "..." : ""}
                </pre>
                <CopyBtn text={item.content} />

                {/* Inline star form */}
                {starringId === item.id && !item.starred && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 6, fontWeight: 600 }}>⭐ เก็บเป็น Reference — ทำไมถึงใช่?</div>
                    <input
                      autoFocus
                      value={starNote}
                      onChange={e => setStarNote(e.target.value)}
                      placeholder="เช่น 'hook โดนเพราะเริ่มจากความกลัว ไม่ใช่ feature' (ไม่ใส่ก็ได้)"
                      onKeyDown={e => {
                        if (e.key === "Enter") { onStar(item.id, true, starNote || undefined, starSeg || undefined); setStarringId(null); }
                        if (e.key === "Escape") setStarringId(null);
                      }}
                      style={{ ...inputStyle, marginBottom: 8, fontSize: 11 }}
                    />
                    <div style={{ fontSize: 10, color: "#fbbf24", opacity: 0.8, marginBottom: 4 }}>ใช้ได้ดีกับกลุ่มลูกค้าไหน? (ไม่เลือกก็ได้ = ใช้ได้ทั่วไป)</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      <button
                        onClick={() => setStarSeg("")}
                        style={{
                          padding: "3px 9px", borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: "pointer",
                          background: starSeg === "" ? "rgba(251,191,36,.15)" : "rgba(255,255,255,.04)",
                          color: starSeg === "" ? "#fbbf24" : "#64748b",
                          border: starSeg === "" ? "1px solid rgba(251,191,36,.35)" : "1px solid rgba(255,255,255,.06)",
                        }}
                      >ทั่วไป</button>
                      {BUYER_SEGMENTS.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setStarSeg(s.value)}
                          style={{
                            padding: "3px 9px", borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: "pointer",
                            background: starSeg === s.value ? "rgba(251,191,36,.15)" : "rgba(255,255,255,.04)",
                            color: starSeg === s.value ? "#fbbf24" : "#64748b",
                            border: starSeg === s.value ? "1px solid rgba(251,191,36,.35)" : "1px solid rgba(255,255,255,.06)",
                          }}
                        >{s.emoji} {s.label}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => { onStar(item.id, true, starNote || undefined, starSeg || undefined); setStarringId(null); }}
                        style={{ ...btnStyle("#fbbf24"), fontSize: 11, padding: "5px 12px" }}
                      >⭐ บันทึก Reference</button>
                      <button
                        onClick={() => setStarringId(null)}
                        style={{ ...btnStyle("#475569"), fontSize: 11, padding: "5px 10px" }}
                      >ยกเลิก</button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  color: "#e2e8f0", fontSize: 12, padding: "8px 10px", outline: "none",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  color: "#e2e8f0", fontSize: 12, padding: "8px 10px", outline: "none",
  boxSizing: "border-box",
};
function btnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}12`, color, border: `1px solid ${color}30`,
    borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
  };
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "keyword",      label: "สร้างจาก Keyword", icon: "✨" },
  { key: "blog",         label: "แปลงจาก Blog",      icon: "📰" },
  { key: "listing",      label: "จาก Listing",        icon: "🏠" },
  { key: "history",      label: "History & Status",   icon: "📡" },
  { key: "queue",        label: "Content Queue",      icon: "📅" },
  { key: "market-intel", label: "Market Intel",       icon: "🧠" },
];

// ── Market Intel Areas ──────────────────────────────────────────────────────
const AREAS = [
  "ลาดหลุมแก้ว", "รังสิต", "คลองสาม", "บางบัวทอง", "นนทบุรี",
  "ปทุมธานี", "ธัญบุรี", "ลำลูกกา", "บึงยี่โต", "สามโคก",
];

// ── FB Queue Types & Helpers ───────────────────────────────────────────────────
type FbQueueItem = {
  id: string;
  date: string;
  content: string;
  status: "pending" | "running" | "published" | "failed";
  postUrl: string;
};

function genId() { return Math.random().toString(36).slice(2, 10); }

const FB_QUEUE_TEMPLATES = [
  `🏠 ฝากขายบ้านและที่ดิน กับ Finnhouses\n\n✨ ทีม Marketing ช่วยโปรโมทให้ฟรี\n✨ มีฐานลูกค้าพร้อมซื้อรอคิวอยู่\n📸 ถ่ายภาพและทำ Listing สวยๆ ให้ฟรี!\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#ฝากขายบ้าน #Finnhouses`,
  `🔍 กำลังจะรับมอบบ้าน แต่ไม่มั่นใจว่างานได้มาตรฐานไหม?\n\n✅ ให้ทีม Finnhouses ช่วยตรวจก่อนเซ็นรับ\n✅ มี Checklist ตรวจครบทุกจุด\n✅ รายงานผลตรงไปตรงมา ไม่มีผลประโยชน์ทับซ้อนกับผู้รับเหมา\n\nทักมาปรึกษาเลย 0627946152\n\n#ตรวจบ้าน #Finnhouses #ผู้ตรวจอิสระ`,
  `💡 ทำไมควรมีผู้ตรวจบ้านอิสระก่อนโอน?\n\nเพราะคนที่สร้าง/ส่งมอบบ้านให้คุณ ไม่ใช่คนกลางที่จะบอกว่างานไม่ได้มาตรฐาน\n\n✅ ตรวจโครงสร้าง ระบบไฟ ระบบน้ำ ก่อนจ่ายเงินงวดสุดท้าย\n✅ ป้องกันปัญหาที่แก้ยากทีหลัง\n\nทักมาปรึกษาเลย 0627946152\n\n#ตรวจรับบ้าน #Finnhouses`,
  `🏡 กำลังหาบ้าน แต่ไม่มีเวลาวิ่งดูเอง?\n\nให้ Finnhouses ช่วยคัดทรัพย์ที่ตรงความต้องการ พร้อมพาไปดูจริง\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#ซื้อบ้าน #Finnhouses #บ้านมือสอง`,
  `🌟 ทำไมต้องเลือก Finnhouses?\n\n🏠 ช่วยซื้อ-ขาย-ฝากขายบ้านอย่างโปร่งใส\n🔍 มีบริการที่ปรึกษาตรวจสอบงานก่อสร้างโดยทีมที่เข้าใจหน้างานจริง\n💬 ปรึกษาได้ตรงๆ ไม่มีการบวกราคาซ้อน\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#Finnhouses #อสังหาริมทรัพย์`,
  `📋 5 จุดที่ควรเช็คก่อนรับมอบบ้าน\n\n✅ รอยร้าวโครงสร้าง\n✅ ระบบไฟและปลั๊กทุกจุด\n✅ ระบบระบายน้ำ/รั่วซึม\n✅ วัสดุปิดผิวตรงตามที่ตกลง\n✅ เอกสารรับประกันจากผู้รับเหมา\n\nไม่มั่นใจว่าเช็คเองครบไหม ให้เราช่วยตรวจ — ทักมาปรึกษาเลย 0627946152\n\n#ตรวจบ้าน #Finnhouses`,
  `🌅 เช้าวันนี้ขอแชร์เคสจริงจากทีม Finnhouses\n\nไม่ว่าจะกำลังตัดสินใจซื้อ ขาย หรือกำลังจะรับมอบบ้าน — เรื่องบ้านเป็นการตัดสินใจใหญ่ที่ไม่ควรเดาเอง\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#Finnhouses #บ้าน`,
];

// ── FB Queue Tab Component ─────────────────────────────────────────────────────
function FbQueueTab() {
  const [fbQueue, setFbQueue]       = useState<FbQueueItem[]>([]);
  const [drafts, setDrafts]         = useState<FbQueueItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // Poll Hub for fb_queue state
  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/blog/state", { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return;
      const d = await r.json();
      setFbQueue(Array.isArray(d.fb_queue) ? d.fb_queue : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [poll]);

  function initDrafts(): FbQueueItem[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + 1 + i);
      return {
        id: genId(),
        date: d.toISOString().split("T")[0],
        content: FB_QUEUE_TEMPLATES[i % FB_QUEUE_TEMPLATES.length],
        status: "pending" as const,
        postUrl: "",
      };
    });
  }

  function openEditor() {
    setDrafts(fbQueue.length > 0 ? fbQueue.map(i => ({ ...i })) : initDrafts());
    setEditorOpen(true);
  }

  async function handleSave() {
    try {
      setBusy(true);
      const r = await fetch("/api/fb/queue/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: drafts }),
      });
      if (!r.ok) throw new Error(`Hub ไม่ตอบสนอง (${r.status}) — Railway อาจกำลัง wake up`);
      const j = await r.json().catch(() => { throw new Error("Server ตอบกลับผิดรูปแบบ — ลองใหม่อีกครั้ง"); });
      if (!j.ok) throw new Error(j.error);
      showToast(`📅 FB Queue ${j.count} วัน บันทึกสำเร็จ`, true);
      await poll();
      setEditorOpen(false);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error saving queue", false);
    } finally { setBusy(false); }
  }

  async function handleClear() {
    try {
      setBusy(true);
      const r = await fetch("/api/fb/queue/clear", { method: "POST" });
      if (!r.ok) throw new Error(`Hub ไม่ตอบสนอง (${r.status})`);
      showToast("FB Queue ล้างแล้ว ✓", true);
      await poll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error clearing queue", false);
    } finally { setBusy(false); }
  }

  const statusColor: Record<string, string> = { pending: "#64748b", running: "#22d3ee", published: "#1877f2", failed: "#f43f5e" };
  const statusLabel: Record<string, string> = { pending: "⏳ รอ", running: "▶ Posting", published: "✅ Posted", failed: "❌ Failed" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: toast.ok ? "rgba(24,119,242,.9)" : "rgba(244,63,94,.9)", color: "#fff",
        }}>{toast.msg}</div>
      )}

      {/* Header card */}
      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(24,119,242,.3)", borderRadius: 20, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#1877f2,#42b0ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📅</div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#60a5fa", fontWeight: 700 }}>FB CONTENT QUEUE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif" }}>วางแผนโพสต์ Facebook 7 วัน</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {fbQueue.length > 0 && (
              <span style={{ fontSize: 12, color: "#60a5fa", background: "rgba(24,119,242,.1)", border: "1px solid rgba(24,119,242,.25)", borderRadius: 20, padding: "3px 12px" }}>
                {fbQueue.filter(i => i.status === "published").length}/{fbQueue.length} โพสต์แล้ว
              </span>
            )}
            {fbQueue.length > 0 && !editorOpen && (
              <button onClick={handleClear} disabled={busy} style={{
                padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.25)", color: "#f43f5e",
              }}>🗑 ล้าง Queue</button>
            )}
            <button onClick={editorOpen ? () => setEditorOpen(false) : openEditor} style={{
              padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: editorOpen ? "rgba(255,255,255,.06)" : "linear-gradient(135deg,#1877f2,#42b0ff)",
              border: editorOpen ? "1px solid rgba(255,255,255,.1)" : "none",
              color: editorOpen ? "#94a3b8" : "#fff",
            }}>
              {editorOpen ? "✕ ปิด" : fbQueue.length > 0 ? "✏️ แก้ไข Queue" : "✨ สร้าง Queue 7 วัน"}
            </button>
          </div>
        </div>
      </div>

      {/* Queue summary cards */}
      {!editorOpen && fbQueue.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {fbQueue.map((item, i) => {
            const c = statusColor[item.status] ?? "#64748b";
            const dateLabel = new Date(item.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
            return (
              <div key={item.id} style={{
                background: item.status === "published" ? "rgba(24,119,242,.08)" : "rgba(255,255,255,.02)",
                border: `1px solid ${c}33`, borderRadius: 14, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>วันที่ {i + 1} — {dateLabel}</span>
                  <span style={{ fontSize: 10, color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                  {item.content.slice(0, 100)}…
                </div>
                {item.postUrl && (
                  <a href={item.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#1877f2", marginTop: 6, display: "block" }}>→ ดูโพสต์บน Facebook</a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!editorOpen && fbQueue.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#475569" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>ยังไม่มี FB Content Queue</div>
          <div style={{ fontSize: 12 }}>กด &ldquo;สร้าง Queue 7 วัน&rdquo; เพื่อวางแผนโพสต์ Facebook ล่วงหน้า</div>
        </div>
      )}

      {/* Editor */}
      {editorOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {drafts.map((item, i) => {
            const dateLabel = new Date(item.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
            return (
              <div key={item.id} style={{ background: "rgba(24,119,242,.04)", border: "1px solid rgba(24,119,242,.15)", borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1877f2,#42b0ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#93c5fd" }}>{dateLabel}</span>
                  <input
                    type="date" value={item.date}
                    onChange={e => setDrafts(prev => prev.map((d, di) => di === i ? { ...d, date: e.target.value } : d))}
                    style={{ marginLeft: "auto", background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "3px 8px", color: "#94a3b8", fontSize: 11 }}
                  />
                </div>
                <textarea
                  value={item.content}
                  onChange={e => setDrafts(prev => prev.map((d, di) => di === i ? { ...d, content: e.target.value } : d))}
                  rows={5}
                  style={{
                    width: "100%", background: "rgba(0,0,0,.3)", border: "1px solid rgba(24,119,242,.2)",
                    borderRadius: 10, padding: "10px 14px", color: "#f1f5f9", fontSize: 12,
                    lineHeight: 1.7, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 10, color: "#334155", marginTop: 4, textAlign: "right" }}>{item.content.length} ตัวอักษร</div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEditorOpen(false)} style={{
              flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 13, cursor: "pointer",
              background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "#64748b",
            }}>ยกเลิก</button>
            <button onClick={handleSave} disabled={busy} style={{
              flex: 3, padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              background: busy ? "rgba(255,255,255,.05)" : "linear-gradient(135deg,#1877f2,#42b0ff)",
              border: "none", color: busy ? "#475569" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {busy
                ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />กำลังบันทึก...</>
                : "💾 บันทึก Queue 7 วัน"}
            </button>
          </div>

          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(24,119,242,.06)", border: "1px solid rgba(24,119,242,.15)" }}>
            <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, marginBottom: 4 }}>⚡ Auto-run — n8n Schedule Trigger</div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}>
              n8n: <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>Schedule Trigger (09:00 daily)</span>
              {" → "}
              <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>HTTP POST /api/fb/queue/run-next</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Market Intelligence Input ───────────────────────────────────────────
function MarketIntelTab() {
  const [text, setText]         = useState("");
  const [area, setArea]         = useState("");
  const [customArea, setCustom] = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<"ok"|"error"|null>(null);
  const [history, setHistory]   = useState<{text:string;area:string;ts:string}[]>([]);

  const finalArea = customArea.trim() || area;

  async function submit() {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch("/api/market-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), area: finalArea || null }),
      });
      const ok = r.ok;
      setResult(ok ? "ok" : "error");
      if (ok) {
        setHistory(prev => [{ text: text.trim(), area: finalArea, ts: new Date().toLocaleTimeString("th-TH") }, ...prev.slice(0, 9)]);
        setText(""); setArea(""); setCustom("");
      }
    } catch { setResult("error"); }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Left: Input */}
      <Card style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e879f9", letterSpacing: ".1em" }}>🧠 MARKET INTELLIGENCE</div>
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
          บันทึกสิ่งที่เห็นในตลาด → AI วิเคราะห์ → บันทึก Supabase → Positioned Content ส่งมา Telegram
        </div>

        {/* Text */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>สิ่งที่เห็นในตลาด</div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"เช่น: ลูกค้าถามเรื่องน้ำท่วมก่อนเลย\nหรือ: บ้าน Modern คลองสามขายไวมาก\nหรือ: ช่วงนี้มีคนทัก เรื่องโบนัสออก"}
            rows={5}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          />
        </div>

        {/* Area selector */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>พื้นที่ (ไม่บังคับ)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {AREAS.map(a => (
              <button key={a} onClick={() => { setArea(a); setCustom(""); }} style={{
                padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: area === a && !customArea ? "rgba(232,121,249,.15)" : "rgba(255,255,255,.04)",
                color: area === a && !customArea ? "#e879f9" : "#64748b",
                border: area === a && !customArea ? "1px solid rgba(232,121,249,.3)" : "1px solid rgba(255,255,255,.06)",
              }}>{a}</button>
            ))}
          </div>
          <input
            value={customArea}
            onChange={e => { setCustom(e.target.value); setArea(""); }}
            placeholder="หรือพิมพ์พื้นที่เอง..."
            style={{ ...inputStyle, marginBottom: 0 }}
          />
        </div>

        {/* Submit */}
        <button onClick={submit} disabled={loading || !text.trim()} style={{
          background: loading ? "rgba(232,121,249,.05)" : "rgba(232,121,249,.12)",
          color: loading ? "#334155" : "#e879f9",
          border: "1px solid rgba(232,121,249,.3)", borderRadius: 12,
          padding: "12px", fontSize: 13, fontWeight: 700, cursor: loading || !text.trim() ? "not-allowed" : "pointer",
        }}>
          {loading ? "⏳ กำลังส่ง..." : "📡 ส่งข้อมูลตลาด"}
        </button>

        {/* Result feedback */}
        {result === "ok" && (
          <div style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#34d399" }}>
            ✅ ส่งแล้ว! AI กำลังวิเคราะห์ → Positioned Content จะส่งมา Telegram เดี๋ยวนี้
          </div>
        )}
        {result === "error" && (
          <div style={{ background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f43f5e" }}>
            ❌ ส่งไม่สำเร็จ — ตรวจสอบว่า n8n Market Intel workflow Publish แล้วหรือยัง
          </div>
        )}

        {/* Tip */}
        <div style={{ background: "rgba(232,121,249,.05)", border: "1px solid rgba(232,121,249,.12)", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
          💡 <strong style={{ color: "#e879f9" }}>Tip:</strong> ส่งผ่าน Telegram ได้เหมือนกัน — พิมพ์<br/>
          <span style={{ color: "#e879f9", fontFamily: "monospace" }}>intel: ข้อความ area:พื้นที่</span><br/>
          ส่งหา bot <span style={{ color: "#e879f9" }}>finnhousesAI</span>
        </div>
      </Card>

      {/* Right: History */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: ".1em", marginBottom: 14 }}>
          🕐 รายการที่เพิ่งส่ง (Session นี้)
        </div>
        {history.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🧠</div>
            <div style={{ fontSize: 14, color: "#475569" }}>ยังไม่มีข้อมูลที่ส่งใน session นี้</div>
            <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>ข้อมูลจะสะสมใน Supabase market_insights</div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((h, i) => (
              <Card key={i} style={{ padding: 14, borderLeft: "3px solid rgba(232,121,249,.4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {h.area && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(232,121,249,.12)", color: "#e879f9", border: "1px solid rgba(232,121,249,.25)", borderRadius: 5, padding: "2px 7px" }}>
                        📍 {h.area}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#334155" }}>{h.ts}</span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{h.text}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LS_KEY = "finnhouses_ai_content_v1";

function loadSaved(): ContentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistSaved(items: ContentItem[]) {
  try {
    // Store text only — skip large base64 images to avoid localStorage quota
    const lite = items.map(i => ({ ...i, imageUrl: "" }));
    localStorage.setItem(LS_KEY, JSON.stringify(lite.slice(0, 50)));
  } catch { /* quota exceeded — skip */ }
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AIContent() {
  const [tab, setTab]     = useState("keyword");
  const [saved, setSaved] = useState<ContentItem[]>(loadSaved);

  function handleSave(item: ContentItem) {
    setSaved(prev => {
      // Dedup: ถ้า content เดิมมีอยู่แล้ว ไม่ save ซ้ำ
      const isDuplicate = prev.some(i => i.content.trim() === item.content.trim());
      if (isDuplicate) return prev;
      const next = [item, ...prev].slice(0, 50);
      persistSaved(next);
      return next;
    });
  }
  function handleDelete(id: number) {
    setSaved(prev => {
      const next = prev.filter(i => i.id !== id);
      persistSaved(next);
      return next;
    });
  }
  function handleStar(id: number, starred: boolean, note?: string, segment?: string) {
    setSaved(prev => {
      const next = prev.map(i => i.id === id ? { ...i, starred, note: note ?? i.note, segment: starred ? (segment ?? i.segment) : i.segment } : i);
      persistSaved(next);
      return next;
    });
  }

  const starredRefs = saved.filter(i => i.starred);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: ".2em", color: "#22d3ee", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
          AI Content Engine
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>FB Content Studio</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>สร้าง content สำหรับ Facebook page · Finnhouses</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,.03)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: tab === t.key ? "rgba(34,211,238,.12)" : "transparent",
            color: tab === t.key ? "#22d3ee" : "#475569",
            border: tab === t.key ? "1px solid rgba(34,211,238,.25)" : "1px solid transparent",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "keyword"      && <KeywordTab onSave={handleSave} starredRefs={starredRefs} />}
        {tab === "blog"         && <BlogConvertTab onSave={handleSave} />}
        {tab === "listing"      && <ListingTab onSave={handleSave} />}
        {tab === "history"      && <HistoryTab saved={saved} onDelete={handleDelete} onStar={handleStar} />}
        {tab === "queue"        && <FbQueueTab />}
        {tab === "market-intel" && <MarketIntelTab />}
      </div>
    </div>
  );
}

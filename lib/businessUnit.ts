// Business-unit keyword classifier for `leads.business_unit`.
//
// Context (session 29, ADR-018 → ADR-019): Archi confirmed leads only ever come from
// 2 of Finnhouses' 3 active business units — "consult" (ที่ปรึกษา/ตรวจสอบงานก่อสร้าง)
// and "list" (รับฝากขายบ้านและที่ดิน). Fix & Flip ("reno") deals are sourced through
// the Deals module (ADR-014/017), not CRM leads, so "reno" was removed from CRM's
// business_unit entirely.
//
// Used in two places (both by Archi's explicit request):
//   1. components/CRM.tsx  — CSV import, when a row's business_unit column is missing/invalid
//   2. components/DashboardOS.tsx — Overview tab, when an existing lead has no business_unit set
//
// Keyword lists below start from Archi's own examples (ตรวจบ้าน/ตรวจสภาพ/การตรวจสอบ for
// consult, ฝากขาย/ขายบ้าน/รายชื่อ for list) plus close synonyms/English equivalents.

export type BusinessUnit = "consult" | "list";

export const CONSULT_KEYWORDS = [
  "ตรวจบ้าน", "ตรวจสภาพ", "ตรวจสอบ", "การตรวจสอบ", "ที่ปรึกษา",
  "ตรวจงานก่อสร้าง", "ตรวจรับบ้าน", "ตรวจโครงสร้าง", "ตรวจก่อนโอน", "ตรวจก่อนโอนกรรมสิทธิ์",
  "inspect", "inspection", "consult", "consultant", "consulting",
];

export const LIST_KEYWORDS = [
  "ฝากขาย", "ขายบ้าน", "รายชื่อ", "ประกาศขาย", "ลงประกาศ", "ขายที่ดิน", "นายหน้า",
  "listing", "list for sale", "sell", "brokerage", "broker",
];

/**
 * เดา business_unit จากข้อความอิสระ (notes, source, ฯลฯ) โดยเทียบ keyword
 * คืนค่า null ถ้าเดาไม่ได้ (ไม่มี keyword ตรงเลย หรือมีทั้งคู่ปนกันจนไม่ชัด)
 */
export function classifyBusinessUnit(...texts: (string | null | undefined)[]): BusinessUnit | null {
  const combined = texts.filter(Boolean).join(" ").toLowerCase();
  if (!combined.trim()) return null;
  const hasConsult = CONSULT_KEYWORDS.some(k => combined.includes(k.toLowerCase()));
  const hasList = LIST_KEYWORDS.some(k => combined.includes(k.toLowerCase()));
  if (hasConsult && !hasList) return "consult";
  if (hasList && !hasConsult) return "list";
  return null; // ไม่มี keyword ตรงเลย หรือมีทั้งคู่ปนกัน — ให้ผู้เรียกใช้ fallback เอง
}

// Fallback สุดท้ายเมื่อ keyword ก็เดาไม่ได้เลย (ไม่มี note/source ให้เทียบ หรือข้อความกำกวม)
// เลือก "list" เพราะเป็นหน่วยที่มักมีข้อมูลระบุชัดเจนกว่าในทางปฏิบัติ (ที่อยู่ทรัพย์ ฯลฯ)
// — จุดนี้เป็นการตัดสินใจเดี่ยว ถ้า Archi เจอว่า lead ถูกจัดผิดหน่วยบ่อย แจ้งเพื่อปรับ default ได้
export const FALLBACK_BUSINESS_UNIT: BusinessUnit = "list";

export function resolveBusinessUnit(
  explicit: string | null | undefined,
  ...fallbackTexts: (string | null | undefined)[]
): BusinessUnit {
  if (explicit === "consult" || explicit === "list") return explicit;
  return classifyBusinessUnit(...fallbackTexts) ?? FALLBACK_BUSINESS_UNIT;
}

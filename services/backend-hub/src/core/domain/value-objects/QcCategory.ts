/**
 * TASK-101: QcCategory Value Object
 * Represents the construction category being inspected
 */

export type QcCategory =
  | "plaster"    // งานก่อฉาบ
  | "concrete"   // งานคอนกรีต
  | "paint"      // งานสี
  | "level"      // งานเส้น Line Level
  | "electrical" // งานระบบไฟฟ้า
  | "plumbing"   // งานระบบน้ำ
  | "finishing"  // งานFinishing
  | "unknown";   // ยังไม่สามารถระบุได้

export const QC_CATEGORIES: QcCategory[] = [
  "plaster", "concrete", "paint", "level",
  "electrical", "plumbing", "finishing", "unknown",
];

/** Keyword hints for AI category guessing */
export const CATEGORY_KEYWORDS: Record<QcCategory, string[]> = {
  plaster:    ["ฉาบ", "ปูน", "ผนัง", "plaster", "wall"],
  concrete:   ["คอนกรีต", "เท", "หล่อ", "concrete", "pour"],
  paint:      ["สี", "ทาสี", "paint", "coat"],
  level:      ["ระดับ", "เส้น", "level", "line"],
  electrical: ["ไฟ", "สาย", "วงจร", "electric", "wire"],
  plumbing:   ["น้ำ", "ท่อ", "pipe", "plumb"],
  finishing:  ["ปิด", "finish", "trim", "door", "window"],
  unknown:    [],
};

export function isValidCategory(value: string): value is QcCategory {
  return QC_CATEGORIES.includes(value as QcCategory);
}

export function categoryToThai(cat: QcCategory): string {
  const map: Record<QcCategory, string> = {
    plaster:    "งานก่อฉาบ",
    concrete:   "งานคอนกรีต",
    paint:      "งานสี",
    level:      "งานระดับ",
    electrical: "งานไฟฟ้า",
    plumbing:   "งานระบบน้ำ",
    finishing:  "งานFinishing",
    unknown:    "ไม่ทราบประเภท",
  };
  return map[cat];
}

/**
 * TASK-101: Severity Value Object
 * Represents defect severity from QC inspection
 */

export type Severity = "none" | "low" | "medium" | "high" | "critical";

export const SEVERITY_ORDER: Severity[] = [
  "none", "low", "medium", "high", "critical",
];

/** Score thresholds: score >= threshold → this severity or better */
const SCORE_TO_SEVERITY: Array<{ minScore: number; severity: Severity }> = [
  { minScore: 90, severity: "none" },
  { minScore: 75, severity: "low" },
  { minScore: 55, severity: "medium" },
  { minScore: 35, severity: "high" },
  { minScore: 0,  severity: "critical" },
];

export function severityFromScore(score: number): Severity {
  for (const { minScore, severity } of SCORE_TO_SEVERITY) {
    if (score >= minScore) return severity;
  }
  return "critical";
}

export function severityToThai(severity: Severity): string {
  const map: Record<Severity, string> = {
    none:     "ผ่าน — ไม่มีข้อบกพร่อง",
    low:      "ข้อบกพร่องเล็กน้อย",
    medium:   "ข้อบกพร่องปานกลาง",
    high:     "ข้อบกพร่องรุนแรง",
    critical: "ข้อบกพร่องวิกฤต — ต้องแก้ไขทันที",
  };
  return map[severity];
}

export function isCritical(severity: Severity): boolean {
  return severity === "critical" || severity === "high";
}

export function isPassing(severity: Severity): boolean {
  return severity === "none" || severity === "low";
}

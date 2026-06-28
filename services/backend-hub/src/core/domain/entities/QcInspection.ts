/**
 * TASK-103: QcInspection Entity
 * Represents a single QC photo inspection — from image received to AI result
 */

import { QcCategory, categoryToThai, CATEGORY_KEYWORDS } from "../value-objects/QcCategory";
import { Severity, severityFromScore, severityToThai, isCritical, isPassing } from "../value-objects/Severity";

export interface QcInspectionState {
  inspectionId: string;
  messageId: string;       // LINE message ID
  userId: string;          // LINE user ID
  imageUrl: string;
  projectCode: string | null;
  category: QcCategory;
  severity: Severity | null;
  defects: string[];
  score: number | null;    // 0-100
  pass: boolean | null;
  summaryTh: string | null;
  aiProvider: string | null;
  processingMs: number | null;
  createdAt: string;       // ISO8601
}

export class QcInspection {
  private constructor(private readonly state: QcInspectionState) {}

  // --- Factory ---

  static create(
    messageId: string,
    userId: string,
    imageUrl: string,
    categoryHint?: string,
    projectCode?: string,
  ): QcInspection {
    const category: QcCategory =
      categoryHint && isValidQcCategory(categoryHint)
        ? (categoryHint as QcCategory)
        : "unknown";

    return new QcInspection({
      inspectionId: `insp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      messageId,
      userId,
      imageUrl,
      projectCode: projectCode ?? null,
      category,
      severity: null,
      defects: [],
      score: null,
      pass: null,
      summaryTh: null,
      aiProvider: null,
      processingMs: null,
      createdAt: new Date().toISOString(),
    });
  }

  static fromState(raw: QcInspectionState): QcInspection {
    return new QcInspection({ ...raw });
  }

  // --- Commands ---

  setResult(
    defects: string[],
    score: number,
    aiProvider: string,
    processingMs: number,
    categoryOverride?: QcCategory,
  ): QcInspection {
    const finalScore = Math.max(0, Math.min(100, score));
    const severity = severityFromScore(finalScore);
    const category = categoryOverride ?? this.state.category;

    return new QcInspection({
      ...this.state,
      category,
      defects,
      score: finalScore,
      severity,
      pass: isPassing(severity),
      summaryTh: buildSummaryTh(category, defects, finalScore, severity),
      aiProvider,
      processingMs,
    });
  }

  // --- Queries ---

  isPassing(): boolean {
    return this.state.pass ?? false;
  }

  isCritical(): boolean {
    return this.state.severity ? isCritical(this.state.severity) : false;
  }

  getSummaryTh(): string {
    return this.state.summaryTh ?? "รอผลการตรวจสอบ";
  }

  /**
   * Guess category from image URL or existing hint
   * Simple keyword matching — AI will override this via setResult()
   */
  static guessCategory(hint: string): QcCategory {
    const lower = hint.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return cat as QcCategory;
      }
    }
    return "unknown";
  }

  // --- Serialization ---

  toState(): QcInspectionState {
    return { ...this.state };
  }

  toApiResponse() {
    return {
      inspectionId: this.state.inspectionId,
      category: this.state.category,
      severity: this.state.severity,
      pass: this.state.pass,
      defects: this.state.defects,
      score: this.state.score,
      summaryTh: this.getSummaryTh(),
      aiProvider: this.state.aiProvider,
      processingMs: this.state.processingMs,
    };
  }

  // --- Getters ---
  get inspectionId(): string { return this.state.inspectionId; }
  get messageId(): string { return this.state.messageId; }
  get userId(): string { return this.state.userId; }
  get imageUrl(): string { return this.state.imageUrl; }
  get category(): QcCategory { return this.state.category; }
  get severity(): Severity | null { return this.state.severity; }
  get score(): number | null { return this.state.score; }
}

// --- Helpers ---

function isValidQcCategory(value: string): boolean {
  return ["plaster","concrete","paint","level","electrical","plumbing","finishing","unknown"]
    .includes(value);
}

function buildSummaryTh(
  category: QcCategory,
  defects: string[],
  score: number,
  severity: Severity,
): string {
  const catTh = categoryToThai(category);
  const sevTh = severityToThai(severity);
  const defectText = defects.length > 0
    ? `\nข้อบกพร่องที่พบ: ${defects.join(", ")}`
    : "";
  return `📋 ${catTh}\nคะแนน: ${score}/100 — ${sevTh}${defectText}`;
}

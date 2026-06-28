/**
 * TASK-305: QcUseCase
 * Orchestrates QC photo inspection pipeline:
 *   1. Create QcInspection entity
 *   2. Reply to LINE immediately (5s timeout)
 *   3. Analyze image via AiGateway (vision)
 *   4. Parse defects + score from AI response
 *   5. Persist to Supabase
 *   6. Emit domain events
 *   7. Push result to LINE user
 */

import { IAiProvider } from "@core/application/ports/IAiProvider";
import { IQcRepository } from "@core/application/ports/IQcRepository";
import { IEventBus } from "@core/application/ports/IEventBus";
import { QcInspection } from "@core/domain/entities/QcInspection";
import { QcCategory } from "@core/domain/value-objects/QcCategory";
import { qcInspectionCompleted } from "@core/domain/events/QcInspectionCompleted";
import { qcDefectFound } from "@core/domain/events/QcDefectFound";
import { LineAdapter } from "@infra/line/LineAdapter";
import { logger } from "@shared/logger";
import { AppError } from "@shared/errors";

export interface QcInspectInput {
  messageId: string;
  replyToken: string;
  userId: string;
  imageUrl: string;
  categoryHint?: string;
  projectCode?: string;
}

export interface QcInspectResult {
  inspectionId: string;
  pass: boolean;
  score: number;
  defects: string[];
  summaryTh: string;
  aiProvider: string;
}

const QC_PROMPT = `คุณเป็นวิศวกรตรวจสอบคุณภาพงานก่อสร้างบ้านพักอาศัยในประเทศไทย มีประสบการณ์ 20 ปี
วิเคราะห์รูปภาพงานก่อสร้างนี้อย่างรอบคอบก่อนตัดสินใจ

=== ประเภทภาพที่พบบ่อยและเกณฑ์ประเมิน ===

**งานก่อนเทคอนกรีต (Pre-pour) — ตรวจเหล็กเสริมและแบบหล่อ**
✅ ปกติ (ไม่ใช่ข้อบกพร่อง):
- ผิวแบบหล่อมีรอยสกปรก/สีเก่า = ปกติสำหรับแบบไม้ใช้ซ้ำ
- เหล็กมีสนิมแดงเล็กน้อย = ปกติ ไม่กระทบกำลัง
- ดินรอบหลุมขุด = ปกติในงานฐานราก
- ไม้ค้ำยันชั่วคราว = ปกติ
❌ ข้อบกพร่องจริง:
- ระยะห่างเหล็กไม่สม่ำเสมอ (ผิดแบบ)
- เหล็กไม่ได้วางบน cover block (คอนกรีตรอง)
- แบบหล่อรั่ว/คดงอมาก
- เหล็กเป็นสนิมผุกร่อน (ไม่ใช่แค่ออกไซด์)

**งานหลังเทคอนกรีต (Post-pour) — ตรวจผิวและโครงสร้าง**
✅ ปกติ (ไม่ใช่ข้อบกพร่อง):
- รอยต่อแบบหล่อ (form joint lines) = ปกติมากในงานไทย
- ผิวสีเทาอ่อนไม่สม่ำเสมอ = ปกติสำหรับคอนกรีตหล่อสด
- ฝุ่น/ดินบนพื้นผิว = ปกติในไซต์ก่อสร้าง
- รอยขัดถูเล็กน้อยจากการถอดแบบ = ปกติ
❌ ข้อบกพร่องจริง (ต้องแจ้ง):
- Honeycombing ชัดเจน (ช่องอากาศขนาดใหญ่ในเนื้อคอนกรีต ≥ 1 cm)
- รอยแตกร้าวที่ขยายตัว (ไม่ใช่รอยผิวเท่านั้น)
- คอนกรีตหลุดร่อนเป็นชิ้นใหญ่
- โครงสร้างเอียงหรือผิดรูปอย่างเห็นได้ชัด
- เหล็กเสริมโผล่ออกมาโดยไม่ตั้งใจ

**งานพื้น/ทางเดิน**
✅ ปกติ: รอยต่อการหดตัว (control joint), ผิวขรุขระจากการใช้ไม้กวาด
❌ ข้อบกพร่อง: รอยแตกร้าวข้ามหน้าตัด, การยุบตัว, คอนกรีตแยกชั้น

=== วิธีตัดสิน ===
- ให้ประโยชน์ของข้อสงสัยแก่งานที่อยู่ระหว่างก่อสร้าง
- ถ้าไม่แน่ใจว่าเป็นข้อบกพร่องหรือลักษณะปกติ → ให้เป็นปกติ
- คะแนน 70+ = ผ่าน, 50-69 = ต้องติดตาม, <50 = ต้องแก้ไข

ตอบเป็น JSON เท่านั้น (ห้ามมีข้อความอื่น):
{
  "defects": ["ข้อบกพร่องจริงเท่านั้น — ถ้าไม่มีให้ใส่ array ว่าง []"],
  "score": 85,
  "category": "concrete_pre_pour|concrete_post_pour|concrete_floor|plaster|paint|level|electrical|plumbing|finishing|unknown",
  "stage": "pre_pour|post_pour|in_progress|completed|unknown",
  "notes": "สรุปสิ่งที่เห็น — ระบุว่าสิ่งใดคือลักษณะปกติของงานก่อสร้าง"
}`;

export class QcUseCase {
  constructor(
    private readonly ai: IAiProvider,
    private readonly qcRepo: IQcRepository,
    private readonly eventBus: IEventBus,
    private readonly line: LineAdapter,
  ) {}

  async inspect(input: QcInspectInput): Promise<QcInspectResult> {
    const { messageId, replyToken, userId, imageUrl, categoryHint, projectCode } = input;

    // 1. Create inspection entity
    let inspection = QcInspection.create(messageId, userId, imageUrl, categoryHint, projectCode);
    logger.info("[QcUseCase] inspection started", { inspectionId: inspection.inspectionId });

    const startMs = Date.now();

    try {
      // 2. Reply immediately — LINE reply token expires in 30s
      await this.line.reply(replyToken, "🔍 กำลังวิเคราะห์รูปภาพ... รอสักครู่");

      // 3. Analyze via AI (vision)
      const aiResult = await this.ai.complete(QC_PROMPT, { imageUrl, maxTokens: 1000 });
      const processingMs = Date.now() - startMs;

      // 4. Parse AI response
      const parsed = this.parseAiResponse(aiResult.text);

      // 5. Update entity with result
      inspection = inspection.setResult(
        parsed.defects,
        parsed.score,
        aiResult.model,
        processingMs,
        parsed.category as QcCategory | undefined,
      );

      // 6. Persist
      await this.qcRepo.save(inspection.toState());

      // 7. Emit events
      this.eventBus.emit(
        qcInspectionCompleted({
          inspectionId: inspection.inspectionId,
          messageId,
          userId,
          category: inspection.category,
          severity: inspection.severity ?? "low",
          score: inspection.score ?? 0,
          pass: inspection.isPassing(),
        }),
      );

      if (!inspection.isPassing()) {
        this.eventBus.emit(
          qcDefectFound({
            inspectionId: inspection.inspectionId,
            userId,
            category: inspection.category,
            severity: inspection.severity ?? "low",
            defects: parsed.defects,
            score: inspection.score ?? 0,
          }),
        );
      }

      // 8. Push result to LINE user
      await this.line.push(userId, inspection.getSummaryTh());

      logger.info("[QcUseCase] inspection completed", {
        inspectionId: inspection.inspectionId,
        score: inspection.score,
        pass: inspection.isPassing(),
        processingMs,
      });

      return {
        inspectionId: inspection.inspectionId,
        pass: inspection.isPassing(),
        score: inspection.score ?? 0,
        defects: parsed.defects,
        summaryTh: inspection.getSummaryTh(),
        aiProvider: aiResult.model,
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("[QcUseCase] inspection failed", {
        inspectionId: inspection.inspectionId,
        error: errorMsg,
      });
      // Try to notify user — don't throw if this also fails
      await this.line.push(userId, "❌ ไม่สามารถวิเคราะห์รูปภาพได้ กรุณาลองใหม่อีกครั้ง")
        .catch(() => undefined);
      throw err;
    }
  }

  private parseAiResponse(text: string): {
    defects: string[];
    score: number;
    category?: string;
  } {
    const jsonMatch = text.match(/\{[\s\S]*"defects"[\s\S]*"score"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new AppError("QC_PARSE_ERROR", "AI response did not contain valid JSON");
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        defects?: string[];
        score?: number;
        category?: string;
      };
      return {
        defects: Array.isArray(parsed.defects) ? parsed.defects : [],
        score: typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : 50,
        category: parsed.category,
      };
    } catch (e) {
      throw new AppError("QC_PARSE_ERROR", `Failed to parse AI JSON: ${String(e)}`);
    }
  }
}

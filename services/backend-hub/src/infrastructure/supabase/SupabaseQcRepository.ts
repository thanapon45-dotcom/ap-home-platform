/**
 * TASK-203: SupabaseQcRepository
 * Implements IQcRepository — reads/writes qc_inspections table
 * Schema: qc_inspections {
 *   id (= inspectionId), message_id, user_id, image_url, category,
 *   severity, score, defects, pass, summary_th, ai_provider,
 *   processing_ms, project_code, created_at
 * }
 */

import {
  IQcRepository,
  QcListFilter,
} from "@core/application/ports/IQcRepository";
import { QcInspectionState } from "@core/domain/entities/QcInspection";
import { getSupabaseClient } from "./SupabaseClient";
import { logger } from "@shared/logger";
import { AppError } from "@shared/errors";

const TABLE = "qc_inspections";

/** Map domain state → DB row */
function toRow(s: QcInspectionState): Record<string, unknown> {
  return {
    id: s.inspectionId,
    message_id: s.messageId,
    user_id: s.userId,
    image_url: s.imageUrl,
    category: s.category,
    severity: s.severity ?? null,
    score: s.score ?? null,
    defects: s.defects,
    pass: s.pass ?? null,
    summary_th: s.summaryTh ?? null,
    ai_provider: s.aiProvider ?? null,
    processing_ms: s.processingMs ?? null,
    project_code: s.projectCode ?? null,
    created_at: s.createdAt,
  };
}

/** Map DB row → domain state */
function fromRow(row: Record<string, unknown>): QcInspectionState {
  return {
    inspectionId: row.id as string,
    messageId: row.message_id as string,
    userId: row.user_id as string,
    imageUrl: row.image_url as string,
    category: row.category as QcInspectionState["category"],
    severity: (row.severity as QcInspectionState["severity"]) ?? null,
    score: (row.score as number) ?? null,
    defects: (row.defects as string[]) ?? [],
    pass: (row.pass as boolean) ?? null,
    summaryTh: (row.summary_th as string) ?? null,
    aiProvider: (row.ai_provider as string) ?? null,
    processingMs: (row.processing_ms as number) ?? null,
    projectCode: (row.project_code as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export class SupabaseQcRepository implements IQcRepository {
  async save(inspection: QcInspectionState): Promise<void> {
    const supabase = getSupabaseClient();
    const row = toRow(inspection);

    const { error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: "id" });

    if (error) {
      logger.error("[QcRepository] save error", { error: error.message });
      throw new AppError("QC_SAVE_ERROR", error.message);
    }
  }

  async findByMessageId(messageId: string): Promise<QcInspectionState | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("message_id", messageId)
      .maybeSingle();

    if (error) {
      logger.error("[QcRepository] findByMessageId error", { error: error.message });
      throw new AppError("QC_FIND_ERROR", error.message);
    }

    return data ? fromRow(data as Record<string, unknown>) : null;
  }

  async list(filter: QcListFilter = {}): Promise<{ total: number; items: QcInspectionState[] }> {
    const supabase = getSupabaseClient();

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filter.category) {
      query = query.eq("category", filter.category);
    }
    if (filter.pass !== undefined) {
      query = query.eq("pass", filter.pass);
    }
    if (filter.projectCode) {
      query = query.eq("project_code", filter.projectCode);
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit ?? 20) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      logger.error("[QcRepository] list error", { error: error.message });
      throw new AppError("QC_LIST_ERROR", error.message);
    }

    return {
      total: count ?? 0,
      items: (data ?? []).map((row) => fromRow(row as Record<string, unknown>)),
    };
  }
}

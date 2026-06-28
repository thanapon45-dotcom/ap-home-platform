import { QcInspectionState } from "../../domain/entities/QcInspection";

export interface QcListFilter {
  category?: string;
  pass?: boolean;
  projectCode?: string;
  limit?: number;
  offset?: number;
}

export interface IQcRepository {
  save(inspection: QcInspectionState): Promise<void>;
  findByMessageId(messageId: string): Promise<QcInspectionState | null>;
  list(filter?: QcListFilter): Promise<{ total: number; items: QcInspectionState[] }>;
}

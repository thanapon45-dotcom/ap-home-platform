import { DomainEvent, createEvent } from "./DomainEvent";

export interface QcDefectFoundPayload {
  inspectionId: string;
  userId: string;
  category: string;
  severity: string;
  defects: string[];
  score: number;
}

export type QcDefectFound = DomainEvent<QcDefectFoundPayload>;
export const EVENT_QC_DEFECT_FOUND = "QcDefectFound";

export function qcDefectFound(payload: QcDefectFoundPayload): QcDefectFound {
  return createEvent(EVENT_QC_DEFECT_FOUND, payload);
}

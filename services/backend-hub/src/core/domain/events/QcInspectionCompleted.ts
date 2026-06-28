import { DomainEvent, createEvent } from "./DomainEvent";

export interface QcInspectionCompletedPayload {
  inspectionId: string;
  messageId: string;
  userId: string;
  category: string;
  severity: string;
  score: number;
  pass: boolean;
}

export type QcInspectionCompleted = DomainEvent<QcInspectionCompletedPayload>;
export const EVENT_QC_INSPECTION_COMPLETED = "QcInspectionCompleted";

export function qcInspectionCompleted(payload: QcInspectionCompletedPayload): QcInspectionCompleted {
  return createEvent(EVENT_QC_INSPECTION_COMPLETED, payload);
}

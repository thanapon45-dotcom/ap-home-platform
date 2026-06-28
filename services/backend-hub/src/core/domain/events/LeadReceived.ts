import { DomainEvent, createEvent } from "./DomainEvent";

export interface LeadReceivedPayload {
  userId: string;
  source: "line" | "facebook" | "web";
  message: string;
  receivedAt: string;
}

export type LeadReceived = DomainEvent<LeadReceivedPayload>;
export const EVENT_LEAD_RECEIVED = "LeadReceived";

export function leadReceived(payload: LeadReceivedPayload): LeadReceived {
  return createEvent(EVENT_LEAD_RECEIVED, payload);
}

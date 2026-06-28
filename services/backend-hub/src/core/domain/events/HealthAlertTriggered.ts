import { DomainEvent, createEvent } from "./DomainEvent";

export interface HealthAlertTriggeredPayload {
  check: string;     // "supabase" | "fbBackend" | "blogStuck" | "dlq"
  message: string;
  severity: "warning" | "critical";
  detail?: unknown;
}

export type HealthAlertTriggered = DomainEvent<HealthAlertTriggeredPayload>;
export const EVENT_HEALTH_ALERT_TRIGGERED = "HealthAlertTriggered";

export function healthAlertTriggered(payload: HealthAlertTriggeredPayload): HealthAlertTriggered {
  return createEvent(EVENT_HEALTH_ALERT_TRIGGERED, payload);
}

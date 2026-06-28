/**
 * TASK-104: Base Domain Event type
 * All domain events extend this shape
 */

export interface DomainEvent<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly occurredAt: string; // ISO8601
}

export function createEvent<T>(type: string, payload: T): DomainEvent<T> {
  return { type, payload, occurredAt: new Date().toISOString() };
}

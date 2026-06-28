import { DomainEvent, createEvent } from "./DomainEvent";

export interface BlogRunFailedPayload {
  runId: string;
  keyword: string;
  error: string;
  failedAt: string;
}

export type BlogRunFailed = DomainEvent<BlogRunFailedPayload>;
export const EVENT_BLOG_RUN_FAILED = "BlogRunFailed";

export function blogRunFailed(payload: BlogRunFailedPayload): BlogRunFailed {
  return createEvent(EVENT_BLOG_RUN_FAILED, payload);
}

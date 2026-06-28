import { DomainEvent, createEvent } from "./DomainEvent";

export interface BlogRunStartedPayload {
  runId: string;
  keyword: string;
  language: string;
  startedAt: string;
}

export type BlogRunStarted = DomainEvent<BlogRunStartedPayload>;
export const EVENT_BLOG_RUN_STARTED = "BlogRunStarted";

export function blogRunStarted(payload: BlogRunStartedPayload): BlogRunStarted {
  return createEvent(EVENT_BLOG_RUN_STARTED, payload);
}

import { DomainEvent, createEvent } from "./DomainEvent";

export interface BlogRunCompletedPayload {
  runId: string;
  keyword: string;
  postId: number;
  postUrl: string;
  completedAt: string;
}

export type BlogRunCompleted = DomainEvent<BlogRunCompletedPayload>;
export const EVENT_BLOG_RUN_COMPLETED = "BlogRunCompleted";

export function blogRunCompleted(payload: BlogRunCompletedPayload): BlogRunCompleted {
  return createEvent(EVENT_BLOG_RUN_COMPLETED, payload);
}

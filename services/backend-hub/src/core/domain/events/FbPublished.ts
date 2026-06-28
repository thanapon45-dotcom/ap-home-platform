import { DomainEvent, createEvent } from "./DomainEvent";

export interface FbPublishedPayload {
  postId: number;
  fbPostId: string;
  publishedAt: string;
}

export type FbPublished = DomainEvent<FbPublishedPayload>;
export const EVENT_FB_PUBLISHED = "FbPublished";

export function fbPublished(payload: FbPublishedPayload): FbPublished {
  return createEvent(EVENT_FB_PUBLISHED, payload);
}

/**
 * TASK-105: IStateRepository Port
 * Persists hub_state (blog status, fb queue, content queue, system info)
 */

export type ContentQueueStatus = "pending" | "running" | "completed" | "failed";

export interface ContentQueueItem {
  id: string;
  date: string;           // "2026-07-01"
  keyword: string;
  category: number;
  visual_hint?: string;
  status: ContentQueueStatus;
  runId?: string | null;
  postUrl?: string | null;
}

export interface HubStateData {
  blog: {
    status: string;
    runId: string | null;
    keyword: string | null;
    startedAt: string | null;
    completedAt: string | null;
    postId: number | null;
    postUrl: string | null;
    error: string | null;
  };
  fb: {
    queueCount: number;
    lastPublishedAt: string | null;
    tokenExpiresAt: string | null;
  };
  system: {
    lastHealthCheck: string | null;
  };
  content_queue: ContentQueueItem[];
}

export interface IStateRepository {
  read(): Promise<HubStateData | null>;
  write(state: HubStateData): Promise<void>;
}

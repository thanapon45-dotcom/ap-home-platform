/**
 * TASK-105: IStateRepository Port
 * Persists hub_state (blog status, fb queue, system info)
 */

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
}

export interface IStateRepository {
  read(): Promise<HubStateData | null>;
  write(state: HubStateData): Promise<void>;
}

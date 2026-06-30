/**
 * TASK-302: StateManager
 * Application-layer service that wraps IStateRepository
 * Provides typed read/write with sensible defaults
 * Single source of truth for hub_state
 */

import { IStateRepository, HubStateData, ContentQueueItem } from "@core/application/ports/IStateRepository";
import { logger } from "@shared/logger";
import { nowIso } from "@shared/time";

const DEFAULT_STATE: HubStateData = {
  blog: {
    status: "idle",
    runId: null,
    keyword: null,
    startedAt: null,
    completedAt: null,
    postId: null,
    postUrl: null,
    error: null,
  },
  fb: {
    queueCount: 0,
    lastPublishedAt: null,
    tokenExpiresAt: null,
  },
  system: {
    lastHealthCheck: null,
  },
  content_queue: [],
};

export class StateManager {
  constructor(private readonly repo: IStateRepository) {}

  /** Read current state, returning defaults if not yet initialized */
  async get(): Promise<HubStateData> {
    const state = await this.repo.read();
    if (!state) {
      logger.info("[StateManager] no state found, using defaults");
      return structuredClone(DEFAULT_STATE);
    }
    // Ensure content_queue exists on older state records that predate this field
    return { ...DEFAULT_STATE, ...state, content_queue: state.content_queue ?? [] };
  }

  /** Partial update — merges deeply at top level only */
  async patch(partial: Partial<HubStateData>): Promise<HubStateData> {
    const current = await this.get();
    const next: HubStateData = {
      blog: { ...current.blog, ...(partial.blog ?? {}) },
      fb: { ...current.fb, ...(partial.fb ?? {}) },
      system: { ...current.system, ...(partial.system ?? {}) },
      content_queue: partial.content_queue !== undefined
        ? partial.content_queue
        : (current.content_queue ?? []),
    };
    await this.repo.write(next);
    logger.debug("[StateManager] state patched");
    return next;
  }

  // --- Blog helpers ---

  async setBlogRunning(runId: string, keyword: string): Promise<void> {
    await this.patch({
      blog: {
        status: "running",
        runId,
        keyword,
        startedAt: nowIso(),
        completedAt: null,
        postId: null,
        postUrl: null,
        error: null,
      },
    });
  }

  async setBlogCompleted(postId: number, postUrl: string): Promise<void> {
    const current = await this.get();
    await this.patch({
      blog: {
        ...current.blog,
        status: "completed",
        completedAt: nowIso(),
        postId,
        postUrl,
        error: null,
      },
    });
  }

  async setBlogFailed(error: string): Promise<void> {
    const current = await this.get();
    await this.patch({
      blog: {
        ...current.blog,
        status: "failed",
        completedAt: nowIso(),
        error,
      },
    });
  }

  async setImageDone(status: string, mediaId: string, mediaUrl: string): Promise<void> {
    const current = await this.get();
    await this.patch({
      blog: {
        ...current.blog,
        image_status: status,
        image_media_id: mediaId,
        image_media_url: mediaUrl,
        image_patched_at: nowIso(),
      },
    });
  }

  async setBlogIdle(): Promise<void> {
    await this.patch({
      blog: {
        status: "idle",
        runId: null,
        keyword: null,
        startedAt: null,
        completedAt: null,
        postId: null,
        postUrl: null,
        error: null,
      },
    });
  }

  // --- Content Queue helpers ---

  /** Replace the entire content queue (used by /queue/build) */
  async setContentQueue(items: ContentQueueItem[]): Promise<void> {
    await this.patch({ content_queue: items });
  }

  /** Clear the content queue */
  async clearContentQueue(): Promise<void> {
    await this.patch({ content_queue: [] });
  }

  /**
   * Pop the next pending queue item — marks it "running" with the given runId.
   * Returns null if the queue is empty or all items are non-pending.
   */
  async popNextQueueItem(runId: string): Promise<ContentQueueItem | null> {
    const current = await this.get();
    const idx = current.content_queue.findIndex(i => i.status === "pending");
    if (idx === -1) return null;

    const item: ContentQueueItem = {
      ...current.content_queue[idx],
      status: "running",
      runId,
    };
    const next = [...current.content_queue];
    next[idx] = item;
    await this.patch({ content_queue: next });
    logger.info("[StateManager] queue item popped", { id: item.id, keyword: item.keyword });
    return item;
  }

  /** Mark the queue item associated with runId as completed */
  async markQueueItemCompleted(runId: string, postUrl: string): Promise<void> {
    const current = await this.get();
    const next = current.content_queue.map(i =>
      i.runId === runId
        ? { ...i, status: "completed" as const, postUrl }
        : i,
    );
    await this.patch({ content_queue: next });
  }

  /** Mark the queue item associated with runId as failed */
  async markQueueItemFailed(runId: string): Promise<void> {
    const current = await this.get();
    const next = current.content_queue.map(i =>
      i.runId === runId ? { ...i, status: "failed" as const } : i,
    );
    await this.patch({ content_queue: next });
  }

  // --- System helpers ---

  async touchHealthCheck(): Promise<void> {
    await this.patch({ system: { lastHealthCheck: nowIso() } });
  }
}

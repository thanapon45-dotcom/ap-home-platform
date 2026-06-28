/**
 * TASK-302: StateManager
 * Application-layer service that wraps IStateRepository
 * Provides typed read/write with sensible defaults
 * Single source of truth for hub_state
 */

import { IStateRepository, HubStateData } from "@core/application/ports/IStateRepository";
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
    return state;
  }

  /** Partial update — merges deeply at top level only */
  async patch(partial: Partial<HubStateData>): Promise<HubStateData> {
    const current = await this.get();
    const next: HubStateData = {
      blog: { ...current.blog, ...(partial.blog ?? {}) },
      fb: { ...current.fb, ...(partial.fb ?? {}) },
      system: { ...current.system, ...(partial.system ?? {}) },
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

  // --- System helpers ---

  async touchHealthCheck(): Promise<void> {
    await this.patch({ system: { lastHealthCheck: nowIso() } });
  }
}

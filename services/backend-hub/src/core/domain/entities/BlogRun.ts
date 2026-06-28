/**
 * TASK-102: BlogRun Entity
 * Represents a single blog writing run — from trigger to completion
 */

import { RunId, createRunId, toRunId } from "../value-objects/RunId";

export type BlogRunStatus = "idle" | "running" | "completed" | "failed";

export interface BlogRunState {
  runId: RunId;
  status: BlogRunStatus;
  keyword: string;
  language: string;
  startedAt: string;       // ISO8601
  completedAt: string | null;
  postId: number | null;
  postUrl: string | null;
  error: string | null;
}

export class BlogRun {
  private constructor(private readonly state: BlogRunState) {}

  // --- Factory ---

  static create(keyword: string, language = "th"): BlogRun {
    return new BlogRun({
      runId: createRunId(),
      status: "running",
      keyword,
      language,
      startedAt: new Date().toISOString(),
      completedAt: null,
      postId: null,
      postUrl: null,
      error: null,
    });
  }

  /** Restore from Supabase hub_state */
  static fromState(raw: BlogRunState): BlogRun {
    return new BlogRun({ ...raw, runId: toRunId(raw.runId) });
  }

  // --- Commands ---

  complete(postId: number, postUrl: string): BlogRun {
    return new BlogRun({
      ...this.state,
      status: "completed",
      completedAt: new Date().toISOString(),
      postId,
      postUrl,
      error: null,
    });
  }

  fail(error: string): BlogRun {
    return new BlogRun({
      ...this.state,
      status: "failed",
      completedAt: new Date().toISOString(),
      error,
    });
  }

  reset(): BlogRun {
    return new BlogRun({
      ...this.state,
      status: "idle",
      completedAt: new Date().toISOString(),
    });
  }

  // --- Queries ---

  isRunning(): boolean {
    return this.state.status === "running";
  }

  /**
   * Returns true if status=running AND started more than thresholdMinutes ago
   * Used by HealthMonitor to detect stuck blog runner
   */
  isStuck(thresholdMinutes = 60): boolean {
    if (this.state.status !== "running") return false;
    const startedMs = new Date(this.state.startedAt).getTime();
    const elapsedMinutes = (Date.now() - startedMs) / 60_000;
    return elapsedMinutes > thresholdMinutes;
  }

  minutesRunning(): number | null {
    if (this.state.status !== "running") return null;
    const startedMs = new Date(this.state.startedAt).getTime();
    return Math.floor((Date.now() - startedMs) / 60_000);
  }

  // --- Serialization ---

  toState(): BlogRunState {
    return { ...this.state };
  }

  toStatusResponse() {
    return {
      status: this.state.status,
      runId: this.state.runId,
      keyword: this.state.keyword,
      startedAt: this.state.startedAt,
      completedAt: this.state.completedAt,
      minutesRunning: this.minutesRunning(),
    };
  }

  // --- Getters ---
  get runId(): RunId { return this.state.runId; }
  get status(): BlogRunStatus { return this.state.status; }
  get keyword(): string { return this.state.keyword; }
}

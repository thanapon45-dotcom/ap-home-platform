/**
 * TASK-314: HealthMonitor
 * Background polling service — detects stuck blog runner and Supabase failures.
 * Runs every 5 minutes inside the Hub v2 process.
 * Sends Telegram alerts with 30-minute cooldown per check type.
 */

import { StateManager } from "@modules/state/StateManager";
import { INotifier } from "@core/application/ports/INotifier";
import { logger } from "@shared/logger";

const DEFAULT_INTERVAL_MS = 5 * 60_000;       // 5 minutes
const BLOG_STUCK_THRESHOLD_MINUTES = 60;       // alert if blog runs > 60 min
const ALERT_COOLDOWN_MS = 30 * 60_000;        // 30-minute cooldown per alert key

export class HealthMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly lastAlertAt: Record<string, number> = {};

  constructor(
    private readonly stateManager: StateManager,
    private readonly notifier: INotifier,
    private readonly intervalMs = DEFAULT_INTERVAL_MS,
  ) {}

  /** Start polling. Safe to call multiple times — won't double-start. */
  start(): void {
    if (this.intervalId !== null) return;

    // Run one check immediately (don't await — non-blocking)
    void this.runChecks();

    this.intervalId = setInterval(() => void this.runChecks(), this.intervalMs);

    logger.info("[HealthMonitor] started", {
      intervalMinutes: this.intervalMs / 60_000,
    });
  }

  /** Stop polling (e.g., during graceful shutdown). */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("[HealthMonitor] stopped");
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async runChecks(): Promise<void> {
    await Promise.allSettled([
      this.checkSupabase(),
      this.checkBlogStuck(),
    ]);
  }

  /** Verify Supabase write path by touching the health-check timestamp. */
  private async checkSupabase(): Promise<void> {
    try {
      await this.stateManager.touchHealthCheck();
    } catch (err) {
      await this.alert(
        "supabase",
        "🚨 Supabase unreachable",
        `Hub v2 cannot write to Supabase: ${String(err)}`,
        "alert",
      );
    }
  }

  /** Alert if the blog runner has been stuck in "running" state for too long. */
  private async checkBlogStuck(): Promise<void> {
    try {
      const state = await this.stateManager.get();
      if (state.blog.status !== "running") return;

      const startedAt = state.blog.startedAt;
      if (!startedAt) return;

      const elapsedMinutes = (Date.now() - new Date(startedAt).getTime()) / 60_000;
      if (elapsedMinutes > BLOG_STUCK_THRESHOLD_MINUTES) {
        await this.alert(
          "blogStuck",
          "⚠️ Blog Runner stuck",
          `RunId: ${state.blog.runId ?? "?"} | Keyword: ${state.blog.keyword ?? "?"} | Running: ${Math.floor(elapsedMinutes)} min`,
          "warn",
        );
      }
    } catch (err) {
      logger.warn("[HealthMonitor] checkBlogStuck error", { error: String(err) });
    }
  }

  /** Send alert via INotifier with per-key cooldown to prevent spam. */
  private async alert(
    key: string,
    title: string,
    body: string,
    level: "alert" | "warn" | "info",
  ): Promise<void> {
    const now = Date.now();
    const lastAt = this.lastAlertAt[key] ?? 0;

    if (now - lastAt < ALERT_COOLDOWN_MS) {
      logger.debug("[HealthMonitor] alert suppressed (cooldown)", { key });
      return;
    }

    this.lastAlertAt[key] = now;

    try {
      await this.notifier.sendStructured({ title, body, level });
      logger.warn("[HealthMonitor] alert sent", { key, title });
    } catch (err) {
      logger.error("[HealthMonitor] failed to send alert", { key, error: String(err) });
    }
  }
}

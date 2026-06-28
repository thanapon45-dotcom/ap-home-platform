/**
 * TASK-404: FbUseCase
 * Orchestrates Facebook publish via FbBackendAdapter + updates hub state
 */

import { FbBackendAdapter, FbPostPayload, FbPostResult } from "@infra/facebook/FbBackendAdapter";
import { StateManager } from "@modules/state/StateManager";
import { INotifier } from "@core/application/ports/INotifier";
import { logger } from "@shared/logger";
import { nowIso } from "@shared/time";
import { ValidationError } from "@shared/errors";

export interface FbPublishInput {
  content: string;
  link?: string;
}

export interface FbPublishOutput {
  postId: string;
  url: string;
  publishedAt: string;
}

export class FbUseCase {
  constructor(
    private readonly fbAdapter: FbBackendAdapter,
    private readonly stateManager: StateManager,
    private readonly notifier: INotifier,
  ) {}

  /** Publish a single post to the Facebook Page */
  async publish(input: FbPublishInput): Promise<FbPublishOutput> {
    const { content, link } = input;

    if (!content || content.trim().length === 0) {
      throw new ValidationError("content is required and must be non-empty");
    }

    logger.info("[FbUseCase] publishing post", { contentLength: content.length, hasLink: !!link });

    let result: FbPostResult;
    try {
      const payload: FbPostPayload = { message: content.trim() };
      if (link) payload.link = link;

      result = await this.fbAdapter.publish(payload);
    } catch (err) {
      logger.error("[FbUseCase] publish failed", { error: String(err) });

      // Notify on failure
      await this.notifier.sendStructured({
        title: "FB Publish Failed",
        body: String(err),
        level: "alert",
      }).catch(() => undefined);

      throw err;
    }

    const publishedAt = nowIso();

    // Update state: increment queueCount-as-published-count, record lastPublishedAt
    const current = await this.stateManager.get();
    await this.stateManager.patch({
      fb: {
        ...current.fb,
        lastPublishedAt: publishedAt,
      },
    });

    logger.info("[FbUseCase] post published", { postId: result.postId, url: result.url });

    return { postId: result.postId, url: result.url, publishedAt };
  }

  /** Handle a status webhook from the external FB backend */
  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    const queueCount = typeof payload.queue === "number" ? payload.queue : undefined;
    const lastPublishedAt = typeof payload.publishedAt === "string" ? payload.publishedAt : undefined;

    if (queueCount !== undefined || lastPublishedAt !== undefined) {
      const current = await this.stateManager.get();
      await this.stateManager.patch({
        fb: {
          ...current.fb,
          ...(queueCount !== undefined ? { queueCount } : {}),
          ...(lastPublishedAt !== undefined ? { lastPublishedAt } : {}),
        },
      });
      logger.info("[FbUseCase] webhook state updated", { queueCount, lastPublishedAt });
    }
  }
}

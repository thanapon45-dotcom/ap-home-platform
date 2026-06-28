/**
 * TASK-303: AiGateway
 * Fallback chain: Claude → OpenAI → Gemini
 * - For QC/vision tasks: tries each provider with imageUrl support
 * - Logs which provider succeeded/failed
 */

import { IAiProvider, AiResult, AiCompleteOptions } from "@core/application/ports/IAiProvider";
import { logger } from "@shared/logger";
import { AppError } from "@shared/errors";

export type AiTask = "blog" | "qc" | "general";

export class AiGateway implements IAiProvider {
  readonly name = "gateway";

  constructor(
    private readonly providers: IAiProvider[],
  ) {
    if (providers.length === 0) {
      throw new AppError("AI_GATEWAY_EMPTY", "AiGateway requires at least one provider");
    }
  }

  async complete(prompt: string, opts: AiCompleteOptions = {}): Promise<AiResult> {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        const result = await provider.complete(prompt, opts);
        logger.info("[AiGateway] success", {
          provider: provider.name,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        });
        return result;
      } catch (err) {
        logger.warn("[AiGateway] provider failed, trying next", {
          provider: provider.name,
          error: String(err),
        });
        lastError = err;
      }
    }

    throw new AppError(
      "AI_ALL_PROVIDERS_FAILED",
      `All AI providers failed. Last error: ${String(lastError)}`,
    );
  }

  /** Return provider names in order (for diagnostics) */
  get providerChain(): string[] {
    return this.providers.map((p) => p.name);
  }
}

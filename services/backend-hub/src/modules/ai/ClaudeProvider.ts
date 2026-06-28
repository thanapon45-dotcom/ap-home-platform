/**
 * TASK-303: ClaudeProvider
 * Implements IAiProvider using @anthropic-ai/sdk
 * Default model: claude-3-5-haiku-20241022 (fast + cheap)
 * Vision model: claude-3-5-sonnet-20241022 (when imageUrl provided)
 */

import Anthropic from "@anthropic-ai/sdk";
import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { IAiProvider, AiResult, AiCompleteOptions } from "@core/application/ports/IAiProvider";
import { AppError } from "@shared/errors";

const TEXT_MODEL = "claude-3-5-haiku-20241022";
const VISION_MODEL = "claude-3-5-sonnet-20241022";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export class ClaudeProvider implements IAiProvider {
  readonly name = "claude";
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(prompt: string, opts: AiCompleteOptions = {}): Promise<AiResult> {
    const model = opts.imageUrl ? VISION_MODEL : TEXT_MODEL;
    const maxTokens = opts.maxTokens ?? 2048;

    let content: Anthropic.MessageParam["content"];

    if (opts.imageUrl) {
      const { base64, mimeType } = await this.fetchImageAsBase64(opts.imageUrl);
      content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as MediaType,
            data: base64,
          },
        },
        { type: "text", text: prompt },
      ];
    } else {
      content = prompt;
    }

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new AppError("CLAUDE_EMPTY_RESPONSE", "No text block in Claude response");
    }

    return {
      text: textBlock.text,
      model: response.model,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }

  private fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(imageUrl);
      const transport = parsed.protocol === "https:" ? https : http;

      transport.get(imageUrl, (res) => {
        const chunks: Buffer[] = [];
        const mimeType = (res.headers["content-type"] as string) || "image/jpeg";

        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const base64 = Buffer.concat(chunks).toString("base64");
          resolve({ base64, mimeType });
        });
        res.on("error", (err: Error) => {
          reject(new AppError("CLAUDE_IMAGE_FETCH_ERROR", err.message));
        });
      }).on("error", (err: Error) => {
        reject(new AppError("CLAUDE_IMAGE_FETCH_ERROR", err.message));
      });
    });
  }
}

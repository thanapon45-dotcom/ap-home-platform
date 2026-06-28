/**
 * TASK-303: OpenAiProvider
 * Implements IAiProvider using openai SDK
 * Model: gpt-4o-mini (text), gpt-4o (vision)
 */

import OpenAI from "openai";
import { IAiProvider, AiResult, AiCompleteOptions } from "@core/application/ports/IAiProvider";
import { AppError } from "@shared/errors";

const TEXT_MODEL = "gpt-4o-mini";
const VISION_MODEL = "gpt-4o";

export class OpenAiProvider implements IAiProvider {
  readonly name = "openai";
  private readonly client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
    });
  }

  async complete(prompt: string, opts: AiCompleteOptions = {}): Promise<AiResult> {
    const model = opts.imageUrl ? VISION_MODEL : TEXT_MODEL;
    const maxTokens = opts.maxTokens ?? 2048;

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = opts.imageUrl
      ? [
          { type: "image_url", image_url: { url: opts.imageUrl } },
          { type: "text", text: prompt },
        ]
      : [{ type: "text", text: prompt }];

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: userContent }],
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new AppError("OPENAI_EMPTY_RESPONSE", "No content in OpenAI response");
    }

    return {
      text: choice.message.content,
      model: response.model,
      tokensIn: response.usage?.prompt_tokens ?? 0,
      tokensOut: response.usage?.completion_tokens ?? 0,
    };
  }
}

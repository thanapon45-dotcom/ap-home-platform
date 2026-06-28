/**
 * TASK-303: GeminiProvider
 * Implements IAiProvider using @google/generative-ai SDK
 * Model: gemini-1.5-flash (text + vision)
 */

import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { IAiProvider, AiResult, AiCompleteOptions } from "@core/application/ports/IAiProvider";
import { AppError } from "@shared/errors";
import * as https from "https";

const MODEL = "gemini-1.5-flash";

export class GeminiProvider implements IAiProvider {
  readonly name = "gemini";
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey ?? process.env.GEMINI_API_KEY ?? "");
  }

  async complete(prompt: string, opts: AiCompleteOptions = {}): Promise<AiResult> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { maxOutputTokens: opts.maxTokens ?? 2048 },
    });

    let parts: (string | Part)[];

    if (opts.imageUrl) {
      const imageData = await this.fetchImageAsBase64(opts.imageUrl);
      parts = [
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.base64,
          },
        },
        prompt,
      ];
    } else {
      parts = [prompt];
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new AppError("GEMINI_EMPTY_RESPONSE", "No text in Gemini response");
    }

    const usage = response.usageMetadata;

    return {
      text,
      model: MODEL,
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: usage?.candidatesTokenCount ?? 0,
    };
  }

  /** Fetch image from URL and convert to base64 for Gemini inline data */
  private fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        const chunks: Buffer[] = [];
        const mimeType = (res.headers["content-type"] as string) || "image/jpeg";

        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const base64 = Buffer.concat(chunks).toString("base64");
          resolve({ base64, mimeType });
        });
        res.on("error", reject);
      }).on("error", reject);
    });
  }
}

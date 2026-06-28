/**
 * TASK-105: IAiProvider Port
 * Interface for all AI providers (OpenAI, Claude, Gemini)
 */

export interface AiCompleteOptions {
  maxTokens?: number;
  imageUrl?: string;   // for vision tasks
  temperature?: number;
}

export interface AiResult {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

export interface IAiProvider {
  readonly name: string;
  complete(prompt: string, opts?: AiCompleteOptions): Promise<AiResult>;
}

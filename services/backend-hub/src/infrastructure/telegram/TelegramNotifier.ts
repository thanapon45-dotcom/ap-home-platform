/**
 * TASK-204: TelegramNotifier
 * Implements INotifier — sends messages via Telegram Bot API
 * Uses native https (no axios) to avoid extra dependencies
 */

import * as https from "https";
import { INotifier, NotifierMessage } from "@core/application/ports/INotifier";
import { logger } from "@shared/logger";
import { withRetry } from "@shared/retry";
import { AppError } from "@shared/errors";

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

export class TelegramNotifier implements INotifier {
  private readonly token: string;
  private readonly chatId: string;

  constructor(token?: string, chatId?: string) {
    this.token = token ?? process.env.TELEGRAM_BOT_TOKEN ?? "";
    this.chatId = chatId ?? process.env.TELEGRAM_CHAT_ID ?? "";

    if (!this.token || !this.chatId) {
      throw new AppError(
        "TELEGRAM_CONFIG_ERROR",
        "TELEGRAM_TOKEN or TELEGRAM_CHAT_ID is missing",
      );
    }
  }

  async send(message: string): Promise<void> {
    await this.postWithRetry(message);
  }

  async sendStructured(msg: NotifierMessage): Promise<void> {
    const prefix = msg.level === "alert" ? "🚨" : msg.level === "warn" ? "⚠️" : "ℹ️";
    const text = `${prefix} *${msg.title}*\n${msg.body}`;
    await this.postWithRetry(text);
  }

  private async postWithRetry(text: string): Promise<void> {
    await withRetry(
      () => this.postToTelegram(text),
      {
        maxAttempts: 3,
        delayMs: 1000,
        onRetry: (attempt, err) => {
          logger.warn("[TelegramNotifier] retry", { attempt, error: String(err) });
        },
      },
    );
    logger.info("[TelegramNotifier] sent", { preview: text.slice(0, 60) });
  }

  private postToTelegram(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: "Markdown",
      });

      const options: https.RequestOptions = {
        hostname: "api.telegram.org",
        path: `/bot${this.token}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body) as TelegramApiResponse;
            if (!parsed.ok) {
              reject(new AppError("TELEGRAM_API_ERROR", parsed.description ?? "Unknown Telegram error"));
            } else {
              resolve();
            }
          } catch {
            reject(new AppError("TELEGRAM_PARSE_ERROR", "Failed to parse Telegram response"));
          }
        });
      });

      req.on("error", (err: Error) => {
        reject(new AppError("TELEGRAM_NETWORK_ERROR", err.message));
      });

      req.write(payload);
      req.end();
    });
  }
}

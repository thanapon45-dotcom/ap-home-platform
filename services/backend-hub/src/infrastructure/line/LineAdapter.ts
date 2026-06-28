/**
 * TASK-206: LineAdapter
 * Sends reply messages to LINE users via LINE Messaging API
 * Also validates webhook signatures (HMAC-SHA256)
 */

import * as https from "https";
import * as crypto from "crypto";
import { logger } from "@shared/logger";
import { withRetry } from "@shared/retry";
import { AppError } from "@shared/errors";

interface LineTextMessage {
  type: "text";
  text: string;
}

interface LineReplyRequest {
  replyToken: string;
  messages: LineTextMessage[];
}

interface LinePushRequest {
  to: string;
  messages: LineTextMessage[];
}

export class LineAdapter {
  private readonly channelSecret: string;
  private readonly channelAccessToken: string;

  constructor(channelSecret?: string, channelAccessToken?: string) {
    this.channelSecret = channelSecret ?? process.env.LINE_CHANNEL_SECRET ?? "";
    this.channelAccessToken = channelAccessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
    // Not throwing here — will throw at call time if unconfigured
  }

  private assertConfigured(): void {
    if (!this.channelSecret || !this.channelAccessToken) {
      throw new AppError("LINE_CONFIG_ERROR", "LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN is missing");
    }
  }

  /** Verify LINE webhook signature (X-Line-Signature header) */
  verifySignature(rawBody: string, signature: string): boolean {
    this.assertConfigured();
    const expected = crypto
      .createHmac("sha256", this.channelSecret)
      .update(rawBody)
      .digest("base64");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  /** Reply to a LINE message using replyToken (1-time use, 30s expiry) */
  async reply(replyToken: string, text: string): Promise<void> {
    this.assertConfigured();
    const body: LineReplyRequest = {
      replyToken,
      messages: [{ type: "text", text }],
    };

    await withRetry(
      () => this.post("/v2/bot/message/reply", body),
      { maxAttempts: 2, delayMs: 500 },
    );

    logger.info("[LineAdapter] reply sent", { preview: text.slice(0, 40) });
  }

  /** Push a message to a user (requires LINE Business/API plan) */
  async push(userId: string, text: string): Promise<void> {
    this.assertConfigured();
    const body: LinePushRequest = {
      to: userId,
      messages: [{ type: "text", text }],
    };

    await withRetry(
      () => this.post("/v2/bot/message/push", body),
      { maxAttempts: 2, delayMs: 500 },
    );

    logger.info("[LineAdapter] push sent", { userId: userId.slice(0, 8) + "…" });
  }

  private post(path: string, payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);

      const options: https.RequestOptions = {
        hostname: "api.line.me",
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            resolve();
          } else {
            reject(new AppError("LINE_API_ERROR", `HTTP ${status}: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on("error", (err: Error) => {
        reject(new AppError("LINE_NETWORK_ERROR", err.message));
      });

      req.write(body);
      req.end();
    });
  }
}

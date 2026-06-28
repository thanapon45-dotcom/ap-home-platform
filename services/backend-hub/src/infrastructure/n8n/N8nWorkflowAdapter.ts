/**
 * TASK-205: N8nWorkflowAdapter
 * Implements IWorkflowEngine — triggers n8n webhooks
 * n8n webhook URL pattern: N8N_BASE_URL/webhook/<webhookId>
 */

import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { IWorkflowEngine } from "@core/application/ports/IWorkflowEngine";
import { logger } from "@shared/logger";
import { withRetry } from "@shared/retry";
import { AppError } from "@shared/errors";

export class N8nWorkflowAdapter implements IWorkflowEngine {
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(baseUrl?: string, secret?: string) {
    this.baseUrl = (baseUrl ?? process.env.N8N_WEBHOOK_BASE_URL ?? "").replace(/\/$/, "");
    this.secret = secret ?? process.env.HUB_SECRET ?? "";

    if (!this.baseUrl) {
      throw new AppError("N8N_CONFIG_ERROR", "N8N_WEBHOOK_BASE_URL is missing");
    }
  }

  async trigger(webhookId: string, payload: Record<string, unknown>): Promise<void> {
    const url = `${this.baseUrl}/webhook/${webhookId}`;

    await withRetry(
      () => this.post(url, payload),
      {
        maxAttempts: 3,
        delayMs: 1500,
        onRetry: (attempt, err) => {
          logger.warn("[N8nAdapter] retry", { webhookId, attempt, error: String(err) });
        },
      },
    );

    logger.info("[N8nAdapter] triggered", { webhookId });
  }

  private post(urlStr: string, payload: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === "https:";
      const transport = isHttps ? https : http;

      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-Hub-Secret": this.secret,
        },
      };

      const req = transport.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            resolve();
          } else {
            reject(new AppError("N8N_WEBHOOK_ERROR", `HTTP ${status}: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on("error", (err: Error) => {
        reject(new AppError("N8N_NETWORK_ERROR", err.message));
      });

      req.write(body);
      req.end();
    });
  }
}

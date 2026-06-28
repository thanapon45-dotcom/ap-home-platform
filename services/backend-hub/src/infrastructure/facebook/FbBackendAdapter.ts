/**
 * TASK-207: FbBackendAdapter
 * Posts to Facebook Page via Graph API
 * Token: FB_PAGE_ACCESS_TOKEN (expires ~Aug 2026 — must renew)
 */

import * as https from "https";
import { logger } from "@shared/logger";
import { withRetry } from "@shared/retry";
import { AppError } from "@shared/errors";

export interface FbPostPayload {
  message: string;
  link?: string;
}

export interface FbPostResult {
  postId: string;
  url: string;
}

interface GraphPostResponse {
  id?: string;
  error?: { message: string; code: number };
}

export class FbBackendAdapter {
  private readonly pageId: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;

  constructor(pageId?: string, accessToken?: string, apiVersion = "v19.0") {
    this.pageId = pageId ?? process.env.FB_PAGE_ID ?? "";
    this.accessToken = accessToken ?? process.env.FB_PAGE_ACCESS_TOKEN ?? "";
    this.apiVersion = apiVersion;

    if (!this.pageId || !this.accessToken) {
      throw new AppError("FB_CONFIG_ERROR", "FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN is missing");
    }
  }

  /** Publish a text post (optionally with link) to the Facebook Page */
  async publish(payload: FbPostPayload): Promise<FbPostResult> {
    const result = await withRetry(
      () => this.graphPost(`/${this.pageId}/feed`, {
        message: payload.message,
        ...(payload.link ? { link: payload.link } : {}),
        access_token: this.accessToken,
      }),
      {
        maxAttempts: 3,
        delayMs: 2000,
        onRetry: (attempt, err) => {
          logger.warn("[FbAdapter] retry", { attempt, error: String(err) });
        },
      },
    );

    if (!result.id) {
      throw new AppError("FB_PUBLISH_ERROR", "No post ID returned from Graph API");
    }

    const postId = result.id;
    const url = `https://www.facebook.com/${postId.replace("_", "/posts/")}`;

    logger.info("[FbAdapter] published", { postId, url });
    return { postId, url };
  }

  private graphPost(path: string, params: Record<string, string>): Promise<GraphPostResponse> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(params);

      const options: https.RequestOptions = {
        hostname: "graph.facebook.com",
        path: `/${this.apiVersion}${path}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as GraphPostResponse;
            if (parsed.error) {
              reject(new AppError("FB_GRAPH_ERROR", `${parsed.error.message} (code ${parsed.error.code})`));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new AppError("FB_PARSE_ERROR", "Failed to parse Graph API response"));
          }
        });
      });

      req.on("error", (err: Error) => {
        reject(new AppError("FB_NETWORK_ERROR", err.message));
      });

      req.write(body);
      req.end();
    });
  }
}

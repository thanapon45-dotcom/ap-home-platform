/**
 * TASK-208: WordPressPublisher
 * Publishes blog posts via WordPress REST API (Application Password auth)
 * Endpoint: WP_URL/wp-json/wp/v2/posts
 */

import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { logger } from "@shared/logger";
import { withRetry } from "@shared/retry";
import { AppError } from "@shared/errors";

export interface WpPostInput {
  title: string;
  content: string;               // HTML
  status: "publish" | "draft";
  categoryIds?: number[];
  tags?: string[];
  excerpt?: string;
}

export interface WpPostResult {
  postId: number;
  postUrl: string;
  status: string;
}

interface WpApiPost {
  id: number;
  link: string;
  status: string;
}

interface WpApiError {
  code: string;
  message: string;
}

export class WordPressPublisher {
  private readonly wpUrl: string;
  private readonly username: string;
  private readonly appPassword: string;

  constructor(wpUrl?: string, username?: string, appPassword?: string) {
    this.wpUrl = (wpUrl ?? process.env.WP_URL ?? "").replace(/\/$/, "");
    this.username = username ?? process.env.WP_USER ?? "";
    this.appPassword = appPassword ?? process.env.WP_APP_PASS ?? "";

    if (!this.wpUrl || !this.username || !this.appPassword) {
      throw new AppError("WP_CONFIG_ERROR", "WP_URL, WP_USERNAME, or WP_APP_PASSWORD is missing");
    }
  }

  async publish(post: WpPostInput): Promise<WpPostResult> {
    const result = await withRetry(
      () => this.createPost(post),
      {
        maxAttempts: 3,
        delayMs: 2000,
        onRetry: (attempt, err) => {
          logger.warn("[WordPressPublisher] retry", { attempt, error: String(err) });
        },
      },
    );

    logger.info("[WordPressPublisher] post published", {
      postId: result.id,
      url: result.link,
    });

    return {
      postId: result.id,
      postUrl: result.link,
      status: result.status,
    };
  }

  private createPost(post: WpPostInput): Promise<WpApiPost> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        title: post.title,
        content: post.content,
        status: post.status,
        excerpt: post.excerpt ?? "",
        categories: post.categoryIds ?? [],
        tags: post.tags ?? [],
      });

      const parsed = new URL(`${this.wpUrl}/wp-json/wp/v2/posts`);
      const isHttps = parsed.protocol === "https:";
      const transport = isHttps ? https : http;
      const auth = Buffer.from(`${this.username}:${this.appPassword}`).toString("base64");

      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: `Basic ${auth}`,
        },
      };

      const req = transport.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          try {
            const parsed = JSON.parse(data);
            if (status >= 200 && status < 300) {
              resolve(parsed as WpApiPost);
            } else {
              const err = parsed as WpApiError;
              reject(new AppError("WP_API_ERROR", `${err.code}: ${err.message}`));
            }
          } catch {
            reject(new AppError("WP_PARSE_ERROR", `Unexpected response (HTTP ${status})`));
          }
        });
      });

      req.on("error", (err: Error) => {
        reject(new AppError("WP_NETWORK_ERROR", err.message));
      });

      req.write(body);
      req.end();
    });
  }
}

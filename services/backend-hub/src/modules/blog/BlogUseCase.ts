/**
 * TASK-304: BlogUseCase
 * Orchestrates the full blog writing pipeline:
 *   1. Guard: reject if already running
 *   2. Generate content via AiGateway
 *   3. Publish to WordPress
 *   4. Persist state + emit domain events
 *   5. Notify on completion/failure
 */

import { IAiProvider } from "@core/application/ports/IAiProvider";
import { IEventBus } from "@core/application/ports/IEventBus";
import { INotifier } from "@core/application/ports/INotifier";
import { blogRunStarted } from "@core/domain/events/BlogRunStarted";
import { blogRunCompleted } from "@core/domain/events/BlogRunCompleted";
import { blogRunFailed } from "@core/domain/events/BlogRunFailed";
import { StateManager } from "@modules/state/StateManager";
import { WordPressPublisher, WpPostInput } from "@infra/wordpress/WordPressPublisher";
import { logger } from "@shared/logger";
import { AppError, ConflictError } from "@shared/errors";
import { nowIso } from "@shared/time";
import { generateRunId } from "@shared/id";

export interface BlogTriggerInput {
  keyword: string;
  language?: string;    // default "th"
  categoryIds?: number[];
}

export interface BlogTriggerResult {
  runId: string;
  postId: number;
  postUrl: string;
  keyword: string;
}

const BLOG_PROMPT_TEMPLATE = (keyword: string, language: string) => `
คุณเป็นนักเขียนบทความอสังหาริมทรัพย์มืออาชีพ เขียนบทความ SEO เรื่อง "${keyword}"

ภาษา: ${language === "th" ? "ไทย" : "English"}

โครงสร้าง:
1. หัวข้อ (H1): ดึงดูด มีคีย์เวิร์ด
2. บทนำ: 2-3 ประโยค สรุปประเด็นสำคัญ
3. เนื้อหาหลัก: 3-5 หัวข้อย่อย (H2) พร้อมรายละเอียด
4. สรุป: Call-to-action ติดต่อ Finnhouses

ความยาว: 600-900 คำ
ส่งผลลัพธ์เป็น JSON: { "title": "...", "content": "<html>" }
`.trim();

export class BlogUseCase {
  constructor(
    private readonly ai: IAiProvider,
    private readonly stateManager: StateManager,
    private readonly wp: WordPressPublisher,
    private readonly eventBus: IEventBus,
    private readonly notifier: INotifier,
  ) {}

  async trigger(input: BlogTriggerInput): Promise<BlogTriggerResult> {
    const { keyword, language = "th", categoryIds = [] } = input;

    // 1. Guard: reject if already running
    const currentState = await this.stateManager.get();
    if (currentState.blog.status === "running") {
      throw new ConflictError(
        "BLOG_ALREADY_RUNNING",
        `Blog run already in progress: ${currentState.blog.runId ?? "unknown"}`,
      );
    }

    const runId = generateRunId();
    const startedAt = nowIso();

    // 2. Mark as running + emit event
    await this.stateManager.setBlogRunning(runId, keyword);
    this.eventBus.emit(blogRunStarted({ runId, keyword, language, startedAt }));
    logger.info("[BlogUseCase] run started", { runId, keyword });

    try {
      // 3. Generate content via AI
      const prompt = BLOG_PROMPT_TEMPLATE(keyword, language);
      const aiResult = await this.ai.complete(prompt, { maxTokens: 3000 });

      // 4. Parse JSON from AI response
      const { title, content } = this.parseAiResponse(aiResult.text);

      // 5. Publish to WordPress
      const wpPost: WpPostInput = {
        title,
        content,
        status: "publish",
        categoryIds,
      };
      const published = await this.wp.publish(wpPost);

      // 6. Update state + emit event
      await this.stateManager.setBlogCompleted(published.postId, published.postUrl);
      this.eventBus.emit(
        blogRunCompleted({
          runId,
          keyword,
          postId: published.postId,
          postUrl: published.postUrl,
          completedAt: nowIso(),
        }),
      );

      // 7. Notify success
      await this.notifier.sendStructured({
        title: "✅ Blog Published",
        body: `Keyword: ${keyword}\nPost: ${published.postUrl}`,
        level: "info",
      });

      logger.info("[BlogUseCase] run completed", { runId, postId: published.postId });
      return { runId, postId: published.postId, postUrl: published.postUrl, keyword };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      await this.stateManager.setBlogFailed(errorMsg);
      this.eventBus.emit(blogRunFailed({ runId, keyword, error: errorMsg, failedAt: nowIso() }));

      await this.notifier.sendStructured({
        title: "❌ Blog Run Failed",
        body: `Keyword: ${keyword}\nError: ${errorMsg}`,
        level: "alert",
      }).catch(() => undefined);

      logger.error("[BlogUseCase] run failed", { runId, error: errorMsg });
      throw err;
    }
  }

  /** Reset a stuck/failed blog run back to idle */
  async reset(): Promise<void> {
    await this.stateManager.setBlogIdle();
    logger.info("[BlogUseCase] state reset to idle");
  }

  private parseAiResponse(text: string): { title: string; content: string } {
    const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new AppError("BLOG_PARSE_ERROR", "AI response did not contain valid JSON");
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { title?: string; content?: string };
      if (!parsed.title || !parsed.content) {
        throw new AppError("BLOG_PARSE_ERROR", "AI JSON missing title or content fields");
      }
      return { title: parsed.title, content: parsed.content };
    } catch (e) {
      throw new AppError("BLOG_PARSE_ERROR", `Failed to parse AI JSON: ${String(e)}`);
    }
  }
}

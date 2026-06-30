/**
 * AP-Home Hub v2 - Entry Point
 * Wires all dependencies and starts Express server
 *
 * Dependency graph:
 *   Config -> Infrastructure -> Modules -> UseCases -> Routes -> App
 */

import "dotenv/config";
import express from "express";

// Config
import { loadConfig } from "@modules/config/Config";

// Infrastructure
import * as crypto from "crypto";
import { getSupabaseClient } from "@infra/supabase/SupabaseClient";
import { SupabaseStateRepository } from "@infra/supabase/SupabaseStateRepository";
import { SupabaseQcRepository } from "@infra/supabase/SupabaseQcRepository";
import { TelegramNotifier } from "@infra/telegram/TelegramNotifier";
import { LineAdapter } from "@infra/line/LineAdapter";
import { WordPressPublisher } from "@infra/wordpress/WordPressPublisher";
import { FbBackendAdapter } from "@infra/facebook/FbBackendAdapter";
import { N8nWorkflowAdapter } from "@infra/n8n/N8nWorkflowAdapter";

// Modules
import { InMemoryEventBus } from "@modules/eventbus/InMemoryEventBus";
import { StateManager } from "@modules/state/StateManager";
import { ClaudeProvider } from "@modules/ai/ClaudeProvider";
import { OpenAiProvider } from "@modules/ai/OpenAiProvider";
import { GeminiProvider } from "@modules/ai/GeminiProvider";
import { AiGateway } from "@modules/ai/AiGateway";
import { BlogUseCase } from "@modules/blog/BlogUseCase";
import { QcUseCase } from "@modules/qc/QcUseCase";
import { FbUseCase } from "@modules/fb/FbUseCase";
import { HealthMonitor } from "@modules/health/HealthMonitor";

// Presentation
import { requireHubSecret } from "@presentation/middleware/auth";
import { errorHandler } from "@presentation/middleware/errorHandler";
import { createHealthRoutes } from "@presentation/routes/healthRoutes";
import { createBlogRoutes } from "@presentation/routes/blogRoutes";
import { createQcRoutes } from "@presentation/routes/qcRoutes";
import { createStateRoutes } from "@presentation/routes/stateRoutes";
import { createFbRoutes, createFbWebhookRoute } from "@presentation/routes/fbRoutes";

import { logger } from "@shared/logger";

async function main(): Promise<void> {
  // 1. Load + validate config (throws on missing env vars)
  const config = loadConfig();
  logger.info("[server] config loaded", { port: config.port });

  // 2. Infrastructure
  const stateRepo = new SupabaseStateRepository();
  const qcRepo = new SupabaseQcRepository();
  const notifier = new TelegramNotifier();
  const line = new LineAdapter();
  const wp = new WordPressPublisher();

  // FB adapter is optional - only instantiate if FB env vars are present
  const fbAdapter = config.fbPageId && config.fbPageAccessToken
    ? new FbBackendAdapter(config.fbPageId, config.fbPageAccessToken)
    : null;

  // n8n adapter is optional - only instantiate if N8N_WEBHOOK_BASE_URL is set
  const n8nAdapter = config.n8nWebhookBaseUrl
    ? new N8nWorkflowAdapter(config.n8nWebhookBaseUrl, config.hubSecret)
    : null;

  // 3. Core modules
  const eventBus = new InMemoryEventBus();
  const stateManager = new StateManager(stateRepo);

  // AI Gateway: Claude -> OpenAI -> Gemini fallback chain
  const aiGateway = new AiGateway([
    new ClaudeProvider(),
    new OpenAiProvider(),
    new GeminiProvider(),
  ]);

  // 4. Use cases
  const blogUseCase = new BlogUseCase(aiGateway, stateManager, wp, eventBus, notifier);
  const qcUseCase = new QcUseCase(aiGateway, qcRepo, eventBus, line);
  const fbUseCase = fbAdapter ? new FbUseCase(fbAdapter, stateManager, notifier) : null;

  // 5. Express app
  const app = express();
  app.use(express.json());
  app.set("trust proxy", 1);

  // Simple ping - Railway healthcheck (compat with v1 /health path)
  app.get("/health", (_req, res) => {
    res.json({ ok: true, version: "2.0.0", mode: "v2" });
  });

  // Public
  app.use("/api/health", createHealthRoutes(stateManager));

  // LINE webhook - uses LINE signature (not Hub secret)
  app.use("/api/qc", createQcRoutes(qcUseCase, qcRepo));

  // Protected
  app.use("/api/blog", requireHubSecret, createBlogRoutes(blogUseCase, stateManager, n8nAdapter ?? undefined));
  app.use("/api/state", requireHubSecret, createStateRoutes(stateManager));

  // FB routes (only if FB credentials are configured)
  if (fbUseCase) {
    app.use("/api/fb", requireHubSecret, createFbRoutes(fbUseCase, stateManager));
    app.use("/webhook/fb", requireHubSecret, createFbWebhookRoute(fbUseCase));
    logger.info("[server] FB routes enabled");
  } else {
    logger.warn("[server] FB routes disabled - FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN not set");
  }

  // POST /webhook/n8n?token=<hmac>
  // Called by n8n WF1 "Notify Hub Published" to mark blog run as completed
  // Public endpoint — authenticated via HMAC token (no requireHubSecret middleware)
  app.post("/webhook/n8n", async (req, res, next) => {
    try {
      const token = (req.query.token as string) ?? "";
      if (!token) {
        res.status(401).json({ ok: false, error: "Missing token" });
        return;
      }

      const state = await stateManager.get();
      if (!state.blog.runId || state.blog.status !== "running") {
        res.status(409).json({ ok: false, error: "No active blog run to acknowledge" });
        return;
      }

      // Validate HMAC: token = HMAC-SHA256(HUB_SECRET, runId)
      const expected = crypto
        .createHmac("sha256", config.hubSecret)
        .update(state.blog.runId)
        .digest("hex");

      if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
        res.status(401).json({ ok: false, error: "Invalid webhook token" });
        return;
      }

      const body = req.body as { postId?: number; postUrl?: string; status?: string };
      const postId = typeof body.postId === "number" ? body.postId : 0;
      const postUrl = typeof body.postUrl === "string" ? body.postUrl : "";
      const runId = state.blog.runId;

      await stateManager.setBlogCompleted(postId, postUrl);

      // Also mark the corresponding content_queue item as completed (if any)
      if (runId) {
        await stateManager.markQueueItemCompleted(runId, postUrl).catch(err =>
          logger.warn("[server] /webhook/n8n markQueueItemCompleted failed", { error: String(err) }),
        );
      }

      logger.info("[server] /webhook/n8n callback received — blog marked completed", {
        runId,
        postId,
        postUrl,
      });

      res.json({ ok: true, data: { runId } });
    } catch (err) {
      next(err);
    }
  });

  // POST /webhook/image-done
  // Called by n8n WF2 after image patching. Authenticated via x-hub-secret header.
  app.post("/webhook/image-done", requireHubSecret, async (req, res, next) => {
    try {
      const body = req.body as { status?: string; post_id?: string | number; media_id?: string | number; media_url?: string };
      const status = String(body.status ?? "patched");
      const postId = String(body.post_id ?? "");
      const mediaId = String(body.media_id ?? "0");
      const mediaUrl = String(body.media_url ?? "");

      await stateManager.setImageDone(status, mediaId, mediaUrl);

      if (status === "patched") {
        notifier.send(`🖼️ 
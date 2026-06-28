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
import { SupabaseStateRepository } from "@infra/supabase/SupabaseStateRepository";
import { SupabaseQcRepository } from "@infra/supabase/SupabaseQcRepository";
import { TelegramNotifier } from "@infra/telegram/TelegramNotifier";
import { LineAdapter } from "@infra/line/LineAdapter";
import { WordPressPublisher } from "@infra/wordpress/WordPressPublisher";
import { FbBackendAdapter } from "@infra/facebook/FbBackendAdapter";

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
  app.use("/api/blog", requireHubSecret, createBlogRoutes(blogUseCase, stateManager));
  app.use("/api/state", requireHubSecret, createStateRoutes(stateManager));

  // FB routes (only if FB credentials are configured)
  if (fbUseCase) {
    app.use("/api/fb", requireHubSecret, createFbRoutes(fbUseCase, stateManager));
    app.use("/webhook/fb", requireHubSecret, createFbWebhookRoute(fbUseCase));
    logger.info("[server] FB routes enabled");
  } else {
    logger.warn("[server] FB routes disabled - FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN not set");
  }

  // 404
  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  // 6. Start server
  app.listen(config.port, () => {
    logger.info("[server] Hub v2 listening", { port: config.port });
  });

  // Touch health check timestamp on startup
  await stateManager.touchHealthCheck().catch(() => undefined);

  // 7. Start HealthMonitor (background polling - runs every 5 min)
  const healthMonitor = new HealthMonitor(stateManager, notifier);
  healthMonitor.start();
}

main().catch((err: unknown) => {
  logger.error("[server] fatal startup error", { error: String(err) });
  process.exit(1);
});

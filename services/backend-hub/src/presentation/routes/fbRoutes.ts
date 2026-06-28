/**
 * TASK-404: FB Routes
 * POST /api/fb/publish   - publish a post to Facebook Page (requires X-Hub-Secret)
 * POST /webhook/fb       - status webhook from external FB backend (requires X-Hub-Secret)
 * GET  /api/fb/state     - current FB state (requires X-Hub-Secret)
 */

import { Router, Request, Response, NextFunction } from "express";
import { FbUseCase } from "@modules/fb/FbUseCase";
import { StateManager } from "@modules/state/StateManager";
import { ValidationError } from "@shared/errors";

export function createFbRoutes(
  fbUseCase: FbUseCase,
  stateManager: StateManager,
): Router {
  const router = Router();

  // POST /api/fb/publish
  // Body: { content: string, link?: string }
  router.post("/publish", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { content, link } = req.body as { content?: unknown; link?: unknown };

      if (!content || typeof content !== "string") {
        throw new ValidationError("content is required and must be a string");
      }

      const result = await fbUseCase.publish({
        content,
        link: typeof link === "string" ? link : undefined,
      });

      res.status(201).json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/fb/state
  router.get("/state", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = await stateManager.get();
      res.json({ ok: true, data: state.fb });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Webhook route — mounted separately at POST /webhook/fb */
export function createFbWebhookRoute(fbUseCase: FbUseCase): Router {
  const router = Router();

  // POST /webhook/fb
  // Called by external FB backend to report status updates
  // Auth: X-Hub-Secret header (same secret as the rest of the API)
  router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = req.body as Record<string, unknown>;
      await fbUseCase.handleWebhook(payload);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

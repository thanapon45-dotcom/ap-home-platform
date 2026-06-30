/**
 * State routes (require X-Hub-Secret)
 * GET /api/state — full hub state snapshot
 *
 * Returns top-level keys (blog, fb, system, content_queue) directly
 * so Marketing.tsx can read d.blog / d.content_queue without a nested .data wrapper.
 */

import { Router, Request, Response, NextFunction } from "express";
import { StateManager } from "@modules/state/StateManager";

export function createStateRoutes(stateManager: StateManager): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = await stateManager.get();
      // Flat structure — client reads d.blog, d.content_queue directly
      res.json({
        ok: true,
        blog: state.blog,
        fb: state.fb,
        system: state.system,
        content_queue: state.content_queue ?? [],
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

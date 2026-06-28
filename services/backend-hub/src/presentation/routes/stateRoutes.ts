/**
 * State routes (require X-Hub-Secret)
 * GET /api/state — full hub state snapshot
 */

import { Router, Request, Response, NextFunction } from "express";
import { StateManager } from "@modules/state/StateManager";

export function createStateRoutes(stateManager: StateManager): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = await stateManager.get();
      res.json({ ok: true, data: state });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

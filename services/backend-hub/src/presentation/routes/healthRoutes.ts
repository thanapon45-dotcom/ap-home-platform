/**
 * GET /api/health — public, no auth
 * Returns version, uptime, blog status
 */

import { Router, Request, Response } from "express";
import { StateManager } from "@modules/state/StateManager";

export function createHealthRoutes(stateManager: StateManager): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response): Promise<void> => {
    try {
      const state = await stateManager.get();
      res.json({
        ok: true,
        data: {
          status: "healthy",
          version: "2.0.0",
          uptime: Math.floor(process.uptime()),
          blog: state.blog.status,
          ts: new Date().toISOString(),
        },
      });
    } catch {
      // Even if state read fails, return basic health
      res.json({
        ok: true,
        data: {
          status: "healthy",
          version: "2.0.0",
          uptime: Math.floor(process.uptime()),
          blog: "unknown",
          ts: new Date().toISOString(),
        },
      });
    }
  });

  return router;
}

/**
 * Blog routes (all require X-Hub-Secret)
 * POST /api/blog/trigger  — start a blog run
 * POST /api/blog/reset    — reset stuck/failed run
 * GET  /api/blog/status   — current run status
 */

import { Router, Request, Response, NextFunction } from "express";
import { BlogUseCase } from "@modules/blog/BlogUseCase";
import { StateManager } from "@modules/state/StateManager";
import { ValidationError } from "@shared/errors";

export function createBlogRoutes(
  blogUseCase: BlogUseCase,
  stateManager: StateManager,
): Router {
  const router = Router();

  // POST /api/blog/trigger
  router.post("/trigger", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyword, language, categoryIds } = req.body as {
        keyword?: unknown;
        language?: unknown;
        categoryIds?: unknown;
      };

      if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
        throw new ValidationError("keyword is required and must be a non-empty string");
      }

      const result = await blogUseCase.trigger({
        keyword: keyword.trim(),
        language: typeof language === "string" ? language : "th",
        categoryIds: Array.isArray(categoryIds) ? (categoryIds as number[]) : [],
      });

      res.status(201).json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/blog/reset
  router.post("/reset", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await blogUseCase.reset();
      res.json({ ok: true, data: { message: "Blog state reset to idle" } });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/blog/status
  router.get("/status", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = await stateManager.get();
      res.json({ ok: true, data: state.blog });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/**
 * Auth middleware — validates X-Hub-Secret header
 * Used on all /api/* routes except /api/health and LINE webhook
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "@shared/logger";

export function requireHubSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.HUB_SECRET;
  if (!secret) {
    logger.error("[auth] HUB_SECRET not configured");
    res.status(500).json({ ok: false, error: { code: "CONFIG_ERROR", message: "Server misconfigured" } });
    return;
  }

  const provided = req.headers["x-hub-secret"];
  if (!provided || provided !== secret) {
    logger.warn("[auth] unauthorized request", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing X-Hub-Secret" } });
    return;
  }

  next();
}

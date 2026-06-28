/**
 * Global Express error handler
 * Must be registered LAST (after all routes)
 */

import { Request, Response, NextFunction } from "express";
import { toErrorResponse } from "@shared/errors";
import { logger } from "@shared/logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const errResp = toErrorResponse(err);

  logger.error("[errorHandler]", {
    code: errResp.code,
    message: errResp.message,
    path: req.path,
    method: req.method,
  });

  const status =
    errResp.code === "NOT_FOUND" ? 404
    : errResp.code === "VALIDATION_ERROR" ? 400
    : errResp.code === "UNAUTHORIZED" ? 401
    : errResp.code.includes("ALREADY_RUNNING") ? 409
    : 500;

  res.status(status).json({ ok: false, error: errResp });
}

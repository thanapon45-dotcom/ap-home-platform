/**
 * QC routes
 * POST /api/qc/webhook/line  — LINE webhook (signature-verified, no Hub secret)
 * GET  /api/qc/inspections   — list recent inspections (requires Hub secret)
 */

import { Router, Request, Response, NextFunction } from "express";
import * as crypto from "crypto";
import { QcUseCase } from "@modules/qc/QcUseCase";
import { IQcRepository } from "@core/application/ports/IQcRepository";
import { logger } from "@shared/logger";

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: {
    type: string;
    id?: string;
    contentProvider?: { type: string; originalContentUrl?: string };
  };
}

interface LineWebhookBody {
  events: LineWebhookEvent[];
}

export function createQcRoutes(
  qcUseCase: QcUseCase,
  qcRepo: IQcRepository,
): Router {
  const router = Router();

  // POST /api/qc/webhook/line — no Hub secret, LINE signature instead
  router.post(
    "/webhook/line",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Verify LINE signature
        const channelSecret = process.env.LINE_CHANNEL_SECRET ?? "";
        const signature = req.headers["x-line-signature"] as string;
        const rawBody = JSON.stringify(req.body);

        if (channelSecret && signature) {
          const expected = crypto
            .createHmac("sha256", channelSecret)
            .update(rawBody)
            .digest("base64");

          if (expected !== signature) {
            res.status(401).json({ ok: false, error: { code: "INVALID_SIGNATURE", message: "LINE signature mismatch" } });
            return;
          }
        }

        // Respond to LINE immediately (must reply within 30s)
        res.json({ ok: true });

        // Process events async (after responding)
        const body = req.body as LineWebhookBody;
        for (const event of body.events ?? []) {
          if (
            event.type === "message" &&
            event.message?.type === "image" &&
            event.replyToken &&
            event.source?.userId
          ) {
            const imageUrl =
              event.message.contentProvider?.type === "external"
                ? event.message.contentProvider.originalContentUrl ?? ""
                : `https://api-data.line.me/v2/bot/message/${event.message.id ?? ""}/content`;

            qcUseCase
              .inspect({
                messageId: event.message.id ?? `msg_${Date.now()}`,
                replyToken: event.replyToken,
                userId: event.source.userId,
                imageUrl,
              })
              .catch((err: unknown) => {
                logger.error("[qcRoute] inspect error", { error: String(err) });
              });
          }
        }
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/qc/inspections
  router.get("/inspections", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const category = typeof req.query.category === "string" ? req.query.category : undefined;

      const result = await qcRepo.list({ limit, offset, category });
      res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

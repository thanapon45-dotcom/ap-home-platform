/**
 * TASK-301: InMemoryEventBus
 * Implements IEventBus — in-process pub/sub for domain events
 * Handlers run sequentially; errors are logged but don't block other handlers
 */

import { IEventBus } from "@core/application/ports/IEventBus";
import { DomainEvent } from "@core/domain/events/DomainEvent";
import { logger } from "@shared/logger";

type EventHandler<T> = (event: DomainEvent<T>) => Promise<void>;

export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, Array<EventHandler<unknown>>>();

  emit<T>(event: DomainEvent<T>): void {
    const list = this.handlers.get(event.type) ?? [];

    // Fire-and-forget: run handlers async but catch individually
    for (const handler of list) {
      handler(event as DomainEvent<unknown>).catch((err: unknown) => {
        logger.error("[EventBus] handler error", {
          eventType: event.type,
          error: String(err),
        });
      });
    }

    if (list.length === 0) {
      logger.debug("[EventBus] no handlers", { eventType: event.type });
    }
  }

  subscribe<T>(type: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler as EventHandler<unknown>);
    logger.debug("[EventBus] subscribed", { eventType: type });
  }

  /** Unsubscribe all handlers for a given event type (useful in tests) */
  unsubscribeAll(type: string): void {
    this.handlers.delete(type);
  }

  /** Return count of registered handlers (for diagnostics) */
  handlerCount(type: string): number {
    return (this.handlers.get(type) ?? []).length;
  }
}

import { DomainEvent } from "../../domain/events/DomainEvent";

export interface IEventBus {
  emit<T>(event: DomainEvent<T>): void;
  subscribe<T>(type: string, handler: (event: DomainEvent<T>) => Promise<void>): void;
}

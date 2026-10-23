import type { ShootoutEvent } from "../domain/events";

export interface EventPublisher {
    publish(events: readonly ShootoutEvent[]): Promise<void>;
}

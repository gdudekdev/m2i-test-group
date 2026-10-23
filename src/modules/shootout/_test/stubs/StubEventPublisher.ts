import type { ShootoutEvent } from "../../domain/events";
import type { EventPublisher } from "../../ports/EventPublisher";

export type PublishedEvent = { type: ShootoutEvent["type"]; storedVersion: number | undefined };

export class StubEventPublisher implements EventPublisher {
    readonly published: PublishedEvent[] = [];

    constructor(private readonly storedVersion: (shootoutId: string) => number | undefined) { }

    async publish(events: readonly ShootoutEvent[]): Promise<void> {
        for (const event of events) {
            this.published.push({ type: event.type, storedVersion: this.storedVersion(event.shootoutId) });
        }
    }
}

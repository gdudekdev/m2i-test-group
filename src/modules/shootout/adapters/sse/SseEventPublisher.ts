import type { EventPublisher } from "../../ports/EventPublisher";
import type { ShootoutReadRepository } from "../../application/queries/shootoutRead.repository";
import type { ShootoutEvent } from "../../domain/events";
import type { ShootoutEvents } from "../../../../sse/ShootoutEvents";

export class SseEventPublisher implements EventPublisher {
    constructor(
        private readonly sse: ShootoutEvents,
        private readonly shootouts: ShootoutReadRepository,
    ) { }

    async publish(events: readonly ShootoutEvent[]): Promise<void> {
        const shootoutIds = new Set(events.map((event) => event.shootoutId));
        for (const id of shootoutIds) {
            const view = await this.shootouts.findById(id);
            if (view) this.sse.publish(view);
        }
    }
}

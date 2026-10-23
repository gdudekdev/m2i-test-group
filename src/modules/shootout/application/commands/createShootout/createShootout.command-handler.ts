import type { CommandHandler } from "../../../../../shared/application/cqrs/CommandHandler";
import type { Clock } from "../../../../../shared/ports/Clock";
import type { IdGenerator } from "../../../../../shared/ports/IdGenerator";
import { Shootout } from "../../../domain/aggregates/Shootout";
import type { EventPublisher } from "../../../ports/EventPublisher";
import type { ShootoutRepository } from "../../../domain/repositories/shootout.repository";
import type { CreateShootoutCommand } from "./createShootout.command";

export class CreateShootoutCommandHandler implements CommandHandler<CreateShootoutCommand, { id: string }> {
    constructor(
        private readonly shootouts: ShootoutRepository,
        private readonly events: EventPublisher,
        private readonly clock: Clock,
        private readonly newId: IdGenerator,
    ) { }

    async handle(command: CreateShootoutCommand): Promise<{ id: string }> {
        const { shootout, events } = Shootout.create({
            id: this.newId(),
            homeTeam: command.homeTeam,
            awayTeam: command.awayTeam,
            startingTeam: command.startingTeam,
            createdAt: this.clock(),
        });

        await this.shootouts.add(shootout);
        await this.events.publish(events);

        return { id: shootout.id };
    }
}

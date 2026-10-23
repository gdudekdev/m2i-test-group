import type { CommandHandler } from "../../../../../shared/application/cqrs/CommandHandler";
import type { Clock } from "../../../../../shared/ports/Clock";
import { ShootoutNotFoundError } from "../../../domain/errors";
import { VersionConflictError } from "../../errors";
import type { EventPublisher } from "../../../ports/EventPublisher";
import type { ShootoutRepository } from "../../../domain/repositories/shootout.repository";
import type { RecordShotCommand } from "./recordShot.command";

export class RecordShotCommandHandler implements CommandHandler<RecordShotCommand> {
    constructor(
        private readonly shootouts: ShootoutRepository,
        private readonly events: EventPublisher,
        private readonly clock: Clock,
    ) { }

    async handle(command: RecordShotCommand): Promise<void> {
        const current = await this.shootouts.findById(command.shootoutId);
        if (!current) throw new ShootoutNotFoundError(command.shootoutId);
        if (current.version !== command.expectedVersion) throw new VersionConflictError();

        const { shootout, events } = current.recordShot(
            {
                team: command.team,
                shooter: command.shooter,
                goalkeeper: command.goalkeeper,
                outcome: command.outcome,
                clientShotId: command.clientShotId,
            },
            this.clock(),
        );

        await this.shootouts.save(shootout, command.expectedVersion);
        await this.events.publish(events);
    }
}

import type { ShotOutcome } from "../../../domain/types/ShotOutcome";
import type { Team } from "../../../domain/types/Team";

export class RecordShotCommand {
    constructor(
        readonly shootoutId: string,
        readonly team: Team,
        readonly shooter: string,
        readonly goalkeeper: string,
        readonly outcome: ShotOutcome,
        readonly clientShotId: string,
        readonly expectedVersion: number,
    ) { }
}

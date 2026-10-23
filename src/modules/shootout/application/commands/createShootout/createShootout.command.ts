import type { Team } from "../../../domain/types/Team";

export class CreateShootoutCommand {
    constructor(
        readonly homeTeam: string,
        readonly awayTeam: string,
        readonly startingTeam: Team,
    ) { }
}

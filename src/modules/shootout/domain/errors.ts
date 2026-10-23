import { DomainError, NotFoundError } from "../../../shared/domain/DomainError";
import type { Team } from "./types/Team";

export class ShootoutNotFoundError extends NotFoundError {
    constructor(shootoutId: string) {
        super("SHOOTOUT_NOT_FOUND", `Shootout ${shootoutId} does not exist.`);
    }
}

export class ShootoutFinishedError extends DomainError {
    constructor() {
        super("SHOOTOUT_FINISHED", "The shootout is already finished.");
    }
}

export class DuplicateShotError extends DomainError {
    constructor() {
        super("DUPLICATE_SHOT", "This shot has already been recorded.");
    }
}

export class NotTeamTurnError extends DomainError {
    constructor(expected: Team | null) {
        super("NOT_TEAM_TURN", `It is ${expected}'s turn to shoot.`);
    }
}

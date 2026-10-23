import type { TeamName } from "../value-objects/TeamName";
import type { ShootoutStatus } from "./ShootoutStatus";
import type { Shot } from "./Shot";
import type { ShotOutcome } from "./ShotOutcome";
import type { Tally } from "./Tally";
import type { Team } from "./Team";

export type ShootoutSnapshot = {
    readonly id: string;
    readonly homeTeam: TeamName;
    readonly awayTeam: TeamName;
    readonly startingTeam: Team;
    readonly status: ShootoutStatus;
    readonly winner: Team | null;
    readonly score: Tally;
    readonly nextTeam: Team | null;
    readonly version: number;
    readonly createdAt: Date;
    readonly shots: readonly Shot[];
};

export type NewShootout = {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startingTeam: Team;
    createdAt: Date;
};

export type ShotAttempt = {
    team: Team;
    shooter: string;
    goalkeeper: string;
    outcome: ShotOutcome;
    clientShotId: string;
};

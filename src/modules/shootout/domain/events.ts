import type { ShotOutcome } from "./types/ShotOutcome";
import type { Team } from "./types/Team";

export type ShootoutCreated = {
    readonly type: "ShootoutCreated";
    readonly shootoutId: string;
    readonly version: number;
    readonly occurredAt: Date;
};

export type ShotRecorded = {
    readonly type: "ShotRecorded";
    readonly shootoutId: string;
    readonly version: number;
    readonly sequence: number;
    readonly team: Team;
    readonly outcome: ShotOutcome;
    readonly occurredAt: Date;
};

export type ShootoutFinished = {
    readonly type: "ShootoutFinished";
    readonly shootoutId: string;
    readonly version: number;
    readonly winner: Team;
    readonly occurredAt: Date;
};

export type ShootoutEvent = ShootoutCreated | ShotRecorded | ShootoutFinished;

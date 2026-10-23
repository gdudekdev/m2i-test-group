import type { PlayerName } from "../value-objects/PlayerName";
import type { ShotOutcome } from "./ShotOutcome";
import type { Team } from "./Team";

export type Shot = {
    readonly sequence: number;
    readonly team: Team;
    readonly shooter: PlayerName;
    readonly goalkeeper: PlayerName;
    readonly outcome: ShotOutcome;
    readonly clientShotId: string;
    readonly recordedAt: Date;
};

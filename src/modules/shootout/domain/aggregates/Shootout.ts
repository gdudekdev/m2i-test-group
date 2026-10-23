import { DuplicateShotError, NotTeamTurnError, ShootoutFinishedError } from "../errors";
import type { ShootoutEvent } from "../events";
import { decideWinner, increment } from "../shootoutRules";
import type { NewShootout, ShootoutSnapshot, ShotAttempt } from "../types/ShootoutSnapshot";
import type { Shot } from "../types/Shot";
import { isGoal } from "../types/ShotOutcome";
import type { Tally } from "../types/Tally";
import { opponent } from "../types/Team";
import { playerName } from "../value-objects/PlayerName";
import { teamName } from "../value-objects/TeamName";

export type Change = { readonly shootout: Shootout; readonly events: readonly ShootoutEvent[] };

export class Shootout {
    private constructor(private readonly state: ShootoutSnapshot) { }

    static create(input: NewShootout): Change {
        const shootout = new Shootout({
            id: input.id,
            homeTeam: teamName(input.homeTeam),
            awayTeam: teamName(input.awayTeam),
            startingTeam: input.startingTeam,
            status: "IN_PROGRESS",
            winner: null,
            score: { home: 0, away: 0 },
            nextTeam: input.startingTeam,
            version: 0,
            createdAt: input.createdAt,
            shots: [],
        });
        return {
            shootout,
            events: [{ type: "ShootoutCreated", shootoutId: input.id, version: 0, occurredAt: input.createdAt }],
        };
    }

    static restore(snapshot: ShootoutSnapshot): Shootout {
        return new Shootout(snapshot);
    }

    get id(): string {
        return this.state.id;
    }

    get version(): number {
        return this.state.version;
    }

    get shots(): readonly Shot[] {
        return this.state.shots;
    }

    toSnapshot(): ShootoutSnapshot {
        return this.state;
    }

    recordShot(attempt: ShotAttempt, recordedAt: Date): Change {
        const { state } = this;
        if (state.status === "FINISHED") throw new ShootoutFinishedError();
        if (state.shots.some((shot) => shot.clientShotId === attempt.clientShotId)) {
            throw new DuplicateShotError();
        }
        if (attempt.team !== state.nextTeam) throw new NotTeamTurnError(state.nextTeam);

        const shot: Shot = {
            sequence: state.shots.length + 1,
            team: attempt.team,
            shooter: playerName(attempt.shooter),
            goalkeeper: playerName(attempt.goalkeeper),
            outcome: attempt.outcome,
            clientShotId: attempt.clientShotId,
            recordedAt,
        };
        const shots = [...state.shots, shot];
        const kicks = shots.reduce<Tally>((tally, { team }) => increment(tally, team), { home: 0, away: 0 });
        const score = isGoal(shot.outcome) ? increment(state.score, shot.team) : state.score;
        const winner = decideWinner(score, kicks);
        const version = state.version + 1;

        const events: ShootoutEvent[] = [{
            type: "ShotRecorded",
            shootoutId: state.id,
            version,
            sequence: shot.sequence,
            team: shot.team,
            outcome: shot.outcome,
            occurredAt: recordedAt,
        }];
        if (winner) {
            events.push({ type: "ShootoutFinished", shootoutId: state.id, version, winner, occurredAt: recordedAt });
        }

        return {
            shootout: new Shootout({
                ...state,
                status: winner ? "FINISHED" : "IN_PROGRESS",
                winner,
                nextTeam: winner ? null : opponent(shot.team),
                score,
                version,
                shots,
            }),
            events,
        };
    }
}

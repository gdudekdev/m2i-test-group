import { Shootout } from "../../domain/aggregates/Shootout";
import type { NewShootout, ShotAttempt } from "../../domain/types/ShootoutSnapshot";
import type { ShotOutcome } from "../../domain/types/ShotOutcome";
import type { Team } from "../../domain/types/Team";
import { CreateShootoutCommand } from "../../application/commands/createShootout/createShootout.command";
import { RecordShotCommand } from "../../application/commands/recordShot/recordShot.command";
import type { ShootoutView } from "../../application/queries/ShootoutView";

export const CREATED_AT = new Date("2026-10-17T12:00:00.000Z");
export const RECORDED_AT = new Date("2026-10-17T12:00:05.000Z");

const DEFAULTS = { id: "shootout-1", homeTeam: "France", awayTeam: "Italie", startingTeam: "HOME" as Team };

export const newShootout = (overrides: Partial<NewShootout> = {}): NewShootout =>
    ({ ...DEFAULTS, createdAt: CREATED_AT, ...overrides });

export const aShootout = (overrides: Partial<NewShootout> = {}): Shootout =>
    Shootout.create(newShootout(overrides)).shootout;

export const anAttempt = (team: Team, overrides: Partial<ShotAttempt> = {}): ShotAttempt =>
    ({ team, shooter: "Griezmann", goalkeeper: "Donnarumma", outcome: "GOAL", clientShotId: "client-shot-001", ...overrides });

export const shoot = (shootout: Shootout, attempt: ShotAttempt) => shootout.recordShot(attempt, RECORDED_AT);

export const play = (shootout: Shootout, outcomes: readonly ShotOutcome[]): Shootout =>
    outcomes.reduce((current, outcome) => {
        const attempt = anAttempt(current.toSnapshot().nextTeam!, { outcome, clientShotId: `shot-${current.shots.length + 1}` });
        return shoot(current, attempt).shootout;
    }, shootout);

export const repeat = (outcome: ShotOutcome, times: number): ShotOutcome[] => Array<ShotOutcome>(times).fill(outcome);

export const homeHasShot = (): Shootout => play(aShootout(), ["GOAL"]);

export const homeLeadsThreeNil = (): Shootout => play(aShootout(), ["GOAL", "MISS", "GOAL", "SAVED", "GOAL"]);

export const homeWinsThreeNil = (): Shootout => play(homeLeadsThreeNil(), ["POST"]);

export const levelAfterRegularKicks = (): Shootout => play(aShootout({ startingTeam: "AWAY" }), repeat("GOAL", 10));

export const aCreateShootoutCommand = (overrides: Partial<CreateShootoutCommand> = {}) => {
    const { homeTeam, awayTeam, startingTeam } = { ...DEFAULTS, ...overrides };
    return new CreateShootoutCommand(homeTeam, awayTeam, startingTeam);
};

export const aRecordShotCommand = (expectedVersion: number, overrides: Partial<Omit<RecordShotCommand, "expectedVersion">> = {}) => {
    const shot = { shootoutId: DEFAULTS.id, ...anAttempt("HOME"), ...overrides };
    return new RecordShotCommand(shot.shootoutId, shot.team, shot.shooter, shot.goalkeeper, shot.outcome, shot.clientShotId, expectedVersion);
};

export const aShootoutView = (overrides: Partial<ShootoutView> = {}): ShootoutView => ({
    ...DEFAULTS,
    status: "IN_PROGRESS",
    winner: null,
    score: { home: 0, away: 0 },
    nextTeam: "HOME",
    version: 0,
    createdAt: CREATED_AT.toISOString(),
    shots: [],
    ...overrides,
});

export function errorOf(action: () => unknown): unknown {
    try {
        action();
    } catch (error) {
        return error;
    }
    throw new Error("L'action devait lever une erreur.");
}

import { Shootout } from "../../domain/aggregates/Shootout";
import type { ShootoutRow, ShootoutWithShotsRow, ShotRow } from "./ShootoutRow";
import type { ShootoutSnapshot } from "../../domain/types/ShootoutSnapshot";
import type { ShootoutStatus } from "../../domain/types/ShootoutStatus";
import type { ShootoutView } from "../../application/queries/ShootoutView";
import type { Shot } from "../../domain/types/Shot";
import type { ShotOutcome } from "../../domain/types/ShotOutcome";
import type { Team } from "../../domain/types/Team";
import type { PlayerName } from "../../domain/value-objects/PlayerName";
import type { TeamName } from "../../domain/value-objects/TeamName";

const bySequence = (a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence;

const sortedShots = (row: ShootoutWithShotsRow): ShotRow[] => [...(row.shots ?? [])].sort(bySequence);

const shotToDomain = (row: ShotRow): Shot => ({
    sequence: row.sequence,
    team: row.team as Team,
    shooter: row.shooter as PlayerName,
    goalkeeper: row.goalkeeper as PlayerName,
    outcome: row.outcome as ShotOutcome,
    clientShotId: row.clientShotId,
    recordedAt: row.recordedAt,
});

export function toDomain(row: ShootoutWithShotsRow): Shootout {
    return Shootout.restore({
        id: row.id,
        homeTeam: row.homeTeam as TeamName,
        awayTeam: row.awayTeam as TeamName,
        startingTeam: row.startingTeam as Team,
        status: row.status as ShootoutStatus,
        winner: row.winner as Team | null,
        score: row.score,
        nextTeam: row.nextTeam as Team | null,
        version: row.version,
        createdAt: row.createdAt,
        shots: sortedShots(row).map(shotToDomain),
    });
}

export function toShootoutRow(snapshot: ShootoutSnapshot): ShootoutRow {
    const { shots: _shots, ...row } = snapshot;
    return { ...row, score: { ...row.score } };
}

export function toShotRows(snapshot: ShootoutSnapshot): ShotRow[] {
    return snapshot.shots.map((shot) => ({ ...shot, shootoutId: snapshot.id }));
}

export function toView(row: ShootoutWithShotsRow): ShootoutView {
    return {
        id: row.id,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        startingTeam: row.startingTeam,
        status: row.status,
        winner: row.winner,
        score: row.score,
        nextTeam: row.nextTeam,
        version: row.version,
        createdAt: row.createdAt.toISOString(),
        shots: sortedShots(row).map((shot) => ({
            sequence: shot.sequence,
            team: shot.team,
            shooter: shot.shooter,
            goalkeeper: shot.goalkeeper,
            outcome: shot.outcome,
            clientShotId: shot.clientShotId,
            recordedAt: shot.recordedAt.toISOString(),
        })),
    };
}

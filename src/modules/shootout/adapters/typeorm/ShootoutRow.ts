export type ShotRow = {
    shootoutId: string;
    sequence: number;
    team: string;
    shooter: string;
    goalkeeper: string;
    outcome: string;
    clientShotId: string;
    recordedAt: Date;
};

export type ShootoutRow = {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startingTeam: string;
    status: string;
    winner: string | null;
    score: { home: number; away: number };
    nextTeam: string | null;
    version: number;
    createdAt: Date;
};

export type ShootoutWithShotsRow = ShootoutRow & { shots?: ShotRow[] };

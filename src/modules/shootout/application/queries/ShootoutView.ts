export type ShotView = {
    sequence: number;
    team: string;
    shooter: string;
    goalkeeper: string;
    outcome: string;
    clientShotId: string;
    recordedAt: string;
};

export type ShootoutView = {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startingTeam: string;
    status: string;
    winner: string | null;
    score: { home: number; away: number };
    nextTeam: string | null;
    version: number;
    createdAt: string;
    shots: ShotView[];
};

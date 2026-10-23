export const SHOOTOUT_STATUSES = ["IN_PROGRESS", "FINISHED"] as const;

export type ShootoutStatus = (typeof SHOOTOUT_STATUSES)[number];

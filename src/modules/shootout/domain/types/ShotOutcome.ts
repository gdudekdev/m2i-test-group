export const SHOT_OUTCOMES = ["GOAL", "MISS", "SAVED", "POST", "CROSSBAR"] as const;

export type ShotOutcome = (typeof SHOT_OUTCOMES)[number];

export const isGoal = (outcome: ShotOutcome): boolean => outcome === "GOAL";

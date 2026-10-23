export const TEAMS = ["HOME", "AWAY"] as const;

export type Team = (typeof TEAMS)[number];

export const opponent = (team: Team): Team => (team === "HOME" ? "AWAY" : "HOME");

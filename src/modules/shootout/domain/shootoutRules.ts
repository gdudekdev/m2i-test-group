import type { Tally } from "./types/Tally";
import type { Team } from "./types/Team";

export const REGULAR_KICKS = 5;

export const sideOf = (team: Team): keyof Tally => (team === "HOME" ? "home" : "away");

export const increment = (tally: Tally, team: Team): Tally =>
    sideOf(team) === "home"
        ? { ...tally, home: tally.home + 1 }
        : { ...tally, away: tally.away + 1 };

export function decideWinner(score: Tally, kicks: Tally): Team | null {
    if (kicks.home <= REGULAR_KICKS && kicks.away <= REGULAR_KICKS) {
        if (score.home > score.away + (REGULAR_KICKS - kicks.away)) return "HOME";
        if (score.away > score.home + (REGULAR_KICKS - kicks.home)) return "AWAY";
        return null;
    }
    if (kicks.home !== kicks.away || score.home === score.away) return null;
    return score.home > score.away ? "HOME" : "AWAY";
}

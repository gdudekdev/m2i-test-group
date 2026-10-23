import { describe, expect, test } from "bun:test";
import { decideWinner } from "../../domain/shootoutRules";
import type { Team } from "../../domain/types/Team";

type Case = [given: string, score: [number, number], kicks: [number, number], winner: Team | null];

describe("decideWinner", () => {
    test.each<Case>([
        ["0-0 avant le premier tir", [0, 0], [0, 0], null],
        ["3-0 après 3 tirs contre 2", [3, 0], [3, 2], null],
        ["3-0 après 3 tirs chacun", [3, 0], [3, 3], "HOME"],
        ["0-3 après 3 tirs chacun", [0, 3], [3, 3], "AWAY"],
        ["4-2 après 4 tirs chacun", [4, 2], [4, 4], "HOME"],
        ["4-3 après 5 tirs contre 4", [4, 3], [5, 4], null],
        ["5-4 après 5 tirs chacun", [5, 4], [5, 5], "HOME"],
        ["5-5 après 5 tirs chacun", [5, 5], [5, 5], null],
        ["6-5 en mort subite avant la réponse de AWAY", [6, 5], [6, 5], null],
        ["6-5 en mort subite après 6 tirs chacun", [6, 5], [6, 6], "HOME"],
        ["5-6 en mort subite après 6 tirs chacun", [5, 6], [6, 6], "AWAY"],
        ["7-7 en mort subite après 8 tirs chacun", [7, 7], [8, 8], null],
    ])("étant donné %s, quand le vainqueur est évalué, alors il vaut %p", (_given, [home, away], [kicksHome, kicksAway], winner) => {
        const score = { home, away };
        const kicks = { home: kicksHome, away: kicksAway };

        const result = decideWinner(score, kicks);

        expect(result).toBe(winner);
    });
});

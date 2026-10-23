import { describe, expect, test } from "bun:test";
import { InvalidValueError } from "../../../../shared/domain/DomainError";
import { PLAYER_NAME_MAX_LENGTH, playerName } from "../../domain/value-objects/PlayerName";
import { TEAM_NAME_MAX_LENGTH, teamName } from "../../domain/value-objects/TeamName";
import { errorOf } from "../fixtures/shootout.fixtures";

describe.each([
    ["TeamName", teamName, TEAM_NAME_MAX_LENGTH],
    ["PlayerName", playerName, PLAYER_NAME_MAX_LENGTH],
])("%s", (_name, create, max) => {
    test.each([
        ["d'un caractère", "A", 1],
        [`de ${max} caractères`, "A".repeat(max), max],
        [`de ${max} caractères entourée d'espaces`, `  ${"A".repeat(max)}  `, max],
    ])("étant donné une valeur %s, quand elle est créée, alors elle est acceptée", (_given, value, expectedLength) => {
        const raw = value;

        const name = create(raw);

        expect(name).toHaveLength(expectedLength);
    });

    test.each([
        ["vide", ""],
        ["composée d'espaces", "   "],
        [`de ${max + 1} caractères`, "A".repeat(max + 1)],
    ])("étant donné une valeur %s, quand elle est créée, alors elle est refusée", (_given, value) => {
        const raw = value;

        const error = errorOf(() => create(raw));

        expect(error).toBeInstanceOf(InvalidValueError);
    });
});

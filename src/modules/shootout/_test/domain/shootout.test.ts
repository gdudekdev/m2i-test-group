import { describe, expect, test } from "bun:test";
import { InvalidValueError } from "../../../../shared/domain/DomainError";
import { Shootout } from "../../domain/aggregates/Shootout";
import { DuplicateShotError, NotTeamTurnError, ShootoutFinishedError } from "../../domain/errors";
import type { ShotOutcome } from "../../domain/types/ShotOutcome";
import {
    aShootout,
    anAttempt,
    CREATED_AT,
    errorOf,
    homeHasShot,
    homeLeadsThreeNil,
    homeWinsThreeNil,
    levelAfterRegularKicks,
    newShootout,
    play,
    RECORDED_AT,
    repeat,
    shoot,
} from "../fixtures/shootout.fixtures";

describe("Shootout - étant donné une nouvelle séance où AWAY commence", () => {
    test("quand elle est créée, alors elle est en cours à 0-0, version 0, AWAY attendu", () => {
        const input = newShootout({ startingTeam: "AWAY" });

        const { shootout, events } = Shootout.create(input);

        expect(shootout.toSnapshot()).toMatchObject({ status: "IN_PROGRESS", score: { home: 0, away: 0 }, nextTeam: "AWAY", winner: null, version: 0, shots: [] });
        expect(events).toEqual([{ type: "ShootoutCreated", shootoutId: "shootout-1", version: 0, occurredAt: CREATED_AT }]);
    });

    test.each([
        ["vide", ""],
        ["composé d'espaces", "   "],
        ["de 81 caractères", "A".repeat(81)],
    ])("quand le nom d'équipe est %s, alors la création est refusée", (_label, homeTeam) => {
        const input = newShootout({ homeTeam });

        const error = errorOf(() => Shootout.create(input));

        expect(error).toBeInstanceOf(InvalidValueError);
    });
});

describe("Shootout - étant donné une séance en cours où HOME commence", () => {
    test("quand HOME marque, alors le but compte, AWAY est attendu et la version passe à 1", () => {
        const shootout = aShootout();

        const { shootout: after, events } = shoot(shootout, anAttempt("HOME"));

        expect(after.toSnapshot()).toMatchObject({ score: { home: 1, away: 0 }, nextTeam: "AWAY", version: 1 });
        expect(after.shots[0]).toMatchObject({ sequence: 1, team: "HOME", outcome: "GOAL", recordedAt: RECORDED_AT });
        expect(events).toMatchObject([{ type: "ShotRecorded", version: 1, sequence: 1 }]);
    });

    test("quand HOME marque, alors la séance d'origine n'est pas modifiée", () => {
        const shootout = aShootout();

        shoot(shootout, anAttempt("HOME"));

        expect(shootout.toSnapshot()).toMatchObject({ version: 0, shots: [] });
    });

    test.each<ShotOutcome>(["MISS", "SAVED", "POST", "CROSSBAR"])("quand HOME tire %s, alors le score ne change pas", (outcome) => {
        const shootout = aShootout();

        const after = play(shootout, [outcome]);

        expect(after.toSnapshot()).toMatchObject({ score: { home: 0, away: 0 }, nextTeam: "AWAY" });
    });

    test("quand trois tirs sont joués, alors ils sont numérotés et les équipes alternent", () => {
        const shootout = aShootout();

        const after = play(shootout, ["GOAL", "MISS", "SAVED"]);

        expect(after.shots.map(({ sequence, team }) => `${sequence}-${team}`)).toEqual(["1-HOME", "2-AWAY", "3-HOME"]);
    });

    test.each([
        ["AWAY tire en premier", anAttempt("AWAY"), NotTeamTurnError],
        ["le tireur est vide", anAttempt("HOME", { shooter: "" }), InvalidValueError],
        ["le gardien fait 61 caractères", anAttempt("HOME", { goalkeeper: "G".repeat(61) }), InvalidValueError],
    ])("quand %s, alors le tir est refusé", (_when, attempt, expected) => {
        const shootout = aShootout();

        const error = errorOf(() => shoot(shootout, attempt));

        expect(error).toBeInstanceOf(expected);
    });
});

describe("Shootout - étant donné que HOME vient de tirer", () => {
    test.each([
        ["HOME tire encore", anAttempt("HOME", { clientShotId: "other" }), NotTeamTurnError],
        ["AWAY réutilise le clientShotId de HOME", anAttempt("AWAY", { clientShotId: "shot-1" }), DuplicateShotError],
        ["HOME tire encore avec un clientShotId déjà utilisé", anAttempt("HOME", { clientShotId: "shot-1" }), DuplicateShotError],
    ])("quand %s, alors le tir est refusé", (_when, attempt, expected) => {
        const shootout = homeHasShot();

        const error = errorOf(() => shoot(shootout, attempt));

        expect(error).toBeInstanceOf(expected);
    });
});

describe("Shootout - étant donné une séance terminée", () => {
    test.each([
        ["un nouveau tir est tenté", anAttempt("HOME", { clientShotId: "late" })],
        ["le tir a aussi un clientShotId déjà utilisé", anAttempt("AWAY", { clientShotId: "shot-1" })],
    ])("quand %s, alors SHOOTOUT_FINISHED est renvoyé en priorité", (_when, attempt) => {
        const shootout = homeWinsThreeNil();

        const error = errorOf(() => shoot(shootout, attempt));

        expect(error).toBeInstanceOf(ShootoutFinishedError);
    });
});

describe("Shootout - étant donné HOME qui mène 3-0 après 3 tirs contre 2", () => {
    test("quand rien n'est encore joué, alors la séance continue car AWAY peut revenir", () => {
        const shootout = homeLeadsThreeNil();

        const snapshot = shootout.toSnapshot();

        expect(snapshot).toMatchObject({ status: "IN_PROGRESS", nextTeam: "AWAY" });
    });

    test("quand AWAY échoue, alors HOME gagne et ShootoutFinished est émis", () => {
        const shootout = homeLeadsThreeNil();

        const { shootout: after, events } = shoot(shootout, anAttempt("AWAY", { outcome: "POST", clientShotId: "last" }));

        expect(after.toSnapshot()).toMatchObject({ status: "FINISHED", winner: "HOME", nextTeam: null });
        expect(events.map((event) => event.type)).toEqual(["ShotRecorded", "ShootoutFinished"]);
    });
});

describe("Shootout - étant donné HOME qui mène 5-4 avant le dernier tir de AWAY", () => {
    test("quand AWAY rate, alors HOME gagne 5-4", () => {
        const shootout = play(aShootout(), repeat("GOAL", 9));

        const after = play(shootout, ["MISS"]);

        expect(after.toSnapshot()).toMatchObject({ status: "FINISHED", winner: "HOME", score: { home: 5, away: 4 } });
    });
});

describe("Shootout - étant donné une égalité après 5 tirs chacun", () => {
    test("quand personne n'a marqué, alors la séance continue en mort subite", () => {
        const shootout = aShootout();

        const after = play(shootout, repeat("MISS", 10));

        expect(after.toSnapshot()).toMatchObject({ status: "IN_PROGRESS", score: { home: 0, away: 0 } });
    });

    test.each([
        ["AWAY marque sans réponse de HOME", ["GOAL"], { status: "IN_PROGRESS", winner: null, nextTeam: "HOME" }],
        ["AWAY marque et HOME échoue", ["GOAL", "CROSSBAR"], { status: "FINISHED", winner: "AWAY", score: { home: 5, away: 6 } }],
        ["les deux marquent puis les deux échouent", ["GOAL", "GOAL", "MISS", "SAVED"], { status: "IN_PROGRESS", score: { home: 6, away: 6 } }],
    ] as const)("à 5-5, quand %s, alors l'issue est celle de la mort subite", (_when, outcomes, expected) => {
        const shootout = levelAfterRegularKicks();

        const after = play(shootout, outcomes);

        expect(after.toSnapshot()).toMatchObject(expected);
    });
});

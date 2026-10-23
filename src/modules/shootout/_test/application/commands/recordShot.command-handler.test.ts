import { describe, expect, test } from "bun:test";
import { InvalidValueError } from "../../../../../shared/domain/DomainError";
import {
    DuplicateShotError,
    NotTeamTurnError,
    ShootoutFinishedError,
    ShootoutNotFoundError,
} from "../../../domain/errors";
import { VersionConflictError } from "../../../application/errors";
import { aRecordShotCommand, aShootout, homeHasShot, homeLeadsThreeNil, homeWinsThreeNil, play, RECORDED_AT } from "../../fixtures/shootout.fixtures";
import { given } from "../../stubs/StubShootoutApplication";

describe("RecordShotCommandHandler - étant donné une séance en cours à la version 0", () => {
    test("quand HOME marque, alors le tir est enregistré en version 1 à l'heure de l'horloge", async () => {
        const app = given(aShootout());

        await app.recordShot(aRecordShotCommand(0));

        expect(app.stored()).toMatchObject({ version: 1, score: { home: 1, away: 0 } });
        expect(app.stored()?.shots[0]?.recordedAt).toEqual(RECORDED_AT);
    });

    test("quand HOME marque, alors ShotRecorded est publié une fois la version 1 persistée", async () => {
        const app = given(aShootout());

        await app.recordShot(aRecordShotCommand(0));

        expect(app.published()).toEqual([{ type: "ShotRecorded", storedVersion: 1 }]);
    });

    test.each([
        ["la séance est inconnue", aRecordShotCommand(0, { shootoutId: "inconnue" }), ShootoutNotFoundError],
        ["la version attendue est périmée", aRecordShotCommand(1), VersionConflictError],
        ["la version attendue est future", aRecordShotCommand(4), VersionConflictError],
        ["AWAY tire alors que HOME commence", aRecordShotCommand(0, { team: "AWAY" }), NotTeamTurnError],
        ["le nom du tireur est vide", aRecordShotCommand(0, { shooter: "  " }), InvalidValueError],
    ])("quand %s, alors le tir est refusé sans effet", async (_when, command, error) => {
        const app = given(aShootout());

        await app.recordShot(command);

        expect(app.error).toBeInstanceOf(error);
        expect(app.hasNoSideEffect()).toBe(true);
    });

    test("quand une autre écriture passe entre la lecture et l'enregistrement, alors la seconde est refusée", async () => {
        const app = given(aShootout()).withConcurrentWrite((found) => play(found, ["MISS"]));

        await app.recordShot(aRecordShotCommand(0));

        expect(app.error).toBeInstanceOf(VersionConflictError);
        expect(app.stored()?.shots.map((shot) => shot.outcome)).toEqual(["MISS"]);
        expect(app.hasNoSideEffect()).toBe(true);
    });
});

describe("RecordShotCommandHandler - étant donné que HOME a déjà tiré", () => {
    test("quand AWAY réutilise le clientShotId de HOME, alors le tir est refusé sans effet", async () => {
        const app = given(homeHasShot());

        await app.recordShot(aRecordShotCommand(1, { team: "AWAY", clientShotId: "shot-1" }));

        expect(app.error).toBeInstanceOf(DuplicateShotError);
        expect(app.hasNoSideEffect()).toBe(true);
    });
});

describe("RecordShotCommandHandler - étant donné HOME qui mène 3-0 après 3 tirs contre 2", () => {
    test("quand AWAY échoue, alors HOME gagne et ShootoutFinished est publié", async () => {
        const app = given(homeLeadsThreeNil());

        await app.recordShot(aRecordShotCommand(5, { team: "AWAY", outcome: "POST", clientShotId: "last" }));

        expect(app.stored()).toMatchObject({ status: "FINISHED", winner: "HOME", nextTeam: null });
        expect(app.published()).toEqual([
            { type: "ShotRecorded", storedVersion: 6 },
            { type: "ShootoutFinished", storedVersion: 6 },
        ]);
    });
});

describe("RecordShotCommandHandler - étant donné une séance terminée en version 6", () => {
    test.each([
        ["un nouveau tir est tenté", aRecordShotCommand(6, { clientShotId: "late" }), ShootoutFinishedError],
        ["la version attendue est périmée", aRecordShotCommand(5, { clientShotId: "late" }), VersionConflictError],
    ])("quand %s, alors il est refusé sans effet", async (_when, command, error) => {
        const app = given(homeWinsThreeNil());

        await app.recordShot(command);

        expect(app.error).toBeInstanceOf(error);
        expect(app.hasNoSideEffect()).toBe(true);
    });
});

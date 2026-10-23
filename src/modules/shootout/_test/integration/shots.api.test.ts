import { afterEach, describe, expect, test } from "bun:test";
import { closeApis, givenApi, NOW } from "../fixtures/api.fixtures";

afterEach(closeApis);

describe("API /shootouts/:id/shots - étant donné une séance en cours à la version 0", () => {
    test("quand HOME marque, alors le tir est renvoyé en 201 et persisté en version 1", async () => {
        const api = await givenApi();
        await api.createShootout();

        const response = await api.recordShot("shootout-1", 0);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({ score: { home: 1, away: 0 }, nextTeam: "AWAY", version: 1 });
        expect(response.body.shots).toEqual([{
            sequence: 1,
            team: "HOME",
            shooter: "Griezmann",
            goalkeeper: "Donnarumma",
            outcome: "GOAL",
            clientShotId: "client-shot-001",
            recordedAt: NOW.toISOString(),
        }]);
        expect(await api.storedShootout("shootout-1")).toEqual({ version: 1, status: "IN_PROGRESS", nextTeam: "AWAY", shots: 1 });
    });

    test.each([
        ["la séance est inconnue", "inconnue", 0, {}, 404, "SHOOTOUT_NOT_FOUND"],
        ["le résultat du tir est inconnu", "shootout-1", 0, { outcome: "OFFSIDE" }, 400, "INVALID_REQUEST"],
        ["expectedVersion est une chaîne", "shootout-1", "0", {}, 400, "INVALID_REQUEST"],
        ["la version attendue est périmée", "shootout-1", 1, {}, 409, "VERSION_CONFLICT"],
        ["AWAY tire alors que HOME commence", "shootout-1", 0, { team: "AWAY" }, 409, "NOT_TEAM_TURN"],
    ] as const)("quand %s, alors le tir est refusé et la base est inchangée", async (_when, id, version, overrides, status, code) => {
        const api = await givenApi();
        await api.createShootout();

        const response = await api.recordShot(id, version as number, overrides);

        expect(response).toMatchObject({ status, body: { error: { code } } });
        expect(await api.storedShootout("shootout-1")).toEqual({ version: 0, status: "IN_PROGRESS", nextTeam: "HOME", shots: 0 });
    });

    test("quand deux tirs sont envoyés avec la même version attendue, alors seul le premier est accepté", async () => {
        const api = await givenApi();
        await api.createShootout();

        const first = await api.recordShot("shootout-1", 0, { clientShotId: "first" });
        const second = await api.recordShot("shootout-1", 0, { team: "AWAY", clientShotId: "second" });

        expect(first.status).toBe(201);
        expect(second).toMatchObject({ status: 409, body: { error: { code: "VERSION_CONFLICT" } } });
        expect(await api.storedShootout("shootout-1")).toMatchObject({ version: 1, shots: 1 });
    });
});

describe("API /shootouts/:id/shots - étant donné que HOME a déjà tiré", () => {
    test("quand AWAY réutilise le clientShotId de HOME, alors le tir est refusé en 409 DUPLICATE_SHOT", async () => {
        const api = await givenApi();
        await api.createShootout();
        await api.recordShot("shootout-1", 0, { clientShotId: "shot-1" });

        const response = await api.recordShot("shootout-1", 1, { team: "AWAY", clientShotId: "shot-1" });

        expect(response).toMatchObject({ status: 409, body: { error: { code: "DUPLICATE_SHOT" } } });
        expect(await api.storedShootout("shootout-1")).toMatchObject({ version: 1, shots: 1 });
    });
});

describe("API /shootouts/:id/shots - étant donné HOME qui mène 3-0 après 3 tirs contre 2", () => {
    test("quand AWAY échoue, alors la séance est terminée et persistée sans équipe attendue", async () => {
        const api = await givenApi();
        await api.createShootout();
        await api.play("shootout-1", ["GOAL", "MISS", "GOAL", "SAVED", "GOAL"]);

        const response = await api.recordShot("shootout-1", 5, { team: "AWAY", outcome: "POST", clientShotId: "last" });

        expect(response.body).toMatchObject({ status: "FINISHED", winner: "HOME", nextTeam: null, version: 6 });
        expect(await api.storedShootout("shootout-1")).toEqual({ version: 6, status: "FINISHED", nextTeam: null, shots: 6 });
    });

    test("quand la séance est terminée, alors un nouveau tir est refusé en 409 SHOOTOUT_FINISHED", async () => {
        const api = await givenApi();
        await api.createShootout();
        await api.play("shootout-1", ["GOAL", "MISS", "GOAL", "SAVED", "GOAL", "POST"]);

        const response = await api.recordShot("shootout-1", 6, { clientShotId: "late" });

        expect(response).toMatchObject({ status: 409, body: { error: { code: "SHOOTOUT_FINISHED" } } });
        expect(await api.storedShootout("shootout-1")).toMatchObject({ version: 6, shots: 6 });
    });
});

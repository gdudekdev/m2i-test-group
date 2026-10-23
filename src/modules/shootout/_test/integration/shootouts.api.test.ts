import { afterEach, describe, expect, test } from "bun:test";
import { closeApis, givenApi, NOW } from "../fixtures/api.fixtures";

afterEach(closeApis);

describe("API /shootouts - étant donné une base vide", () => {
    test("quand une séance est créée, alors elle est renvoyée en 201 avec son Location et persistée", async () => {
        const api = await givenApi();

        const created = await api.createShootout();

        expect(created.status).toBe(201);
        expect(created.location).toBe("/shootouts/shootout-1");
        expect(created.body).toEqual({
            id: "shootout-1",
            homeTeam: "France",
            awayTeam: "Italie",
            startingTeam: "HOME",
            status: "IN_PROGRESS",
            winner: null,
            score: { home: 0, away: 0 },
            nextTeam: "HOME",
            version: 0,
            createdAt: NOW.toISOString(),
            shots: [],
        });
        expect(await api.storedShootout("shootout-1")).toEqual({ version: 0, status: "IN_PROGRESS", nextTeam: "HOME", shots: 0 });
    });

    test.each([
        ["startingTeam vaut 'Home'", { startingTeam: "Home" }],
        ["le nom d'équipe est vide", { homeTeam: "   " }],
        ["le nom d'équipe fait 81 caractères", { homeTeam: "A".repeat(81) }],
    ])("quand %s, alors la création est refusée en 400 sans rien persister", async (_when, overrides) => {
        const api = await givenApi();

        const response = await api.createShootout(overrides);

        expect(response).toMatchObject({ status: 400, body: { error: { code: "INVALID_REQUEST" } } });
        expect(await api.storedShootout("shootout-1")).toBeUndefined();
    });

    test("quand le corps n'est pas du JSON, alors la création est refusée en 400", async () => {
        const api = await givenApi();

        const response = await api.request("POST", "/shootouts", '{"homeTeam": "France",');

        expect(response).toMatchObject({ status: 400, body: { error: { code: "INVALID_REQUEST" } } });
    });
});

describe("API /shootouts/:id - étant donné une séance enregistrée", () => {
    test("quand elle est consultée, alors la représentation persistée est renvoyée en 200", async () => {
        const api = await givenApi();
        const created = await api.createShootout();

        const read = await api.request("GET", "/shootouts/shootout-1");

        expect(read.status).toBe(200);
        expect(read.body).toEqual(created.body);
    });

    test("quand une séance inconnue est consultée, alors la réponse est 404 SHOOTOUT_NOT_FOUND", async () => {
        const api = await givenApi();
        await api.createShootout();

        const read = await api.request("GET", "/shootouts/inconnue");

        expect(read).toMatchObject({ status: 404, body: { error: { code: "SHOOTOUT_NOT_FOUND" } } });
    });

    test("quand une route inconnue est appelée, alors la réponse est 404 NOT_FOUND", async () => {
        const api = await givenApi();

        const response = await api.request("GET", "/route-inconnue");

        expect(response).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    });
});

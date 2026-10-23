import { afterEach, describe, expect, test } from "bun:test";
import { closeApis, givenApi } from "../fixtures/api.fixtures";

afterEach(closeApis);

describe("Persistance SQLite - étant donné une base migrée", () => {
    test("quand le schéma est comparé aux entités, alors il n'y a aucun écart", async () => {
        const api = await givenApi();

        const pending = await api.dataSource.driver.createSchemaBuilder().log();

        expect(pending.upQueries).toHaveLength(0);
    });

    test("quand les migrations sont relancées, alors aucune n'est rejouée", async () => {
        const api = await givenApi();

        const replayed = await api.dataSource.runMigrations();

        expect(replayed).toHaveLength(0);
    });

    test("quand la dernière migration est annulée puis réappliquée, alors le schéma revient à l'identique", async () => {
        const api = await givenApi();

        await api.dataSource.undoLastMigration();
        await api.dataSource.runMigrations();

        expect((await api.dataSource.driver.createSchemaBuilder().log()).upQueries).toHaveLength(0);
    });
});

describe("Persistance SQLite - étant donné deux séances en cours", () => {
    test("quand chacune enregistre son premier tir, alors les deux tirs n°1 coexistent", async () => {
        const api = await givenApi();
        await api.createShootout();
        await api.createShootout({ homeTeam: "Brésil", awayTeam: "Argentine" });

        const first = await api.recordShot("shootout-1", 0);
        const second = await api.recordShot("shootout-2", 0);

        expect([first.status, second.status]).toEqual([201, 201]);
        expect(await api.storedShootout("shootout-1")).toMatchObject({ shots: 1 });
        expect(await api.storedShootout("shootout-2")).toMatchObject({ shots: 1 });
    });

    test("quand une séance est relue depuis la base, alors ses tirs reviennent dans l'ordre", async () => {
        const api = await givenApi();
        await api.createShootout();
        await api.play("shootout-1", ["GOAL", "MISS", "SAVED", "POST"]);

        const read = await api.request("GET", "/shootouts/shootout-1");

        expect(read.body.shots.map((shot: { sequence: number; outcome: string }) => `${shot.sequence}-${shot.outcome}`))
            .toEqual(["1-GOAL", "2-MISS", "3-SAVED", "4-POST"]);
    });
});

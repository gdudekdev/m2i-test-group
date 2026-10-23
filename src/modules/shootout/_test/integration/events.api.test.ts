import { afterEach, describe, expect, test } from "bun:test";
import { closeApis, givenApi } from "../fixtures/api.fixtures";

afterEach(closeApis);

describe("API /shootouts/:id/events - étant donné une séance enregistrée", () => {
    test("quand le flux est ouvert, alors l'état courant est envoyé en premier", async () => {
        const api = await givenApi();
        await api.createShootout();

        const stream = await api.openEvents("shootout-1");
        const [initial] = await stream.next(1);

        expect(stream.contentType).toContain("text/event-stream");
        expect(initial).toMatchObject({ event: "shootout.updated", id: "0", data: { id: "shootout-1", version: 0, shots: [] } });
    });

    test("quand un tir est accepté, alors un événement porte la nouvelle version et la séance complète", async () => {
        const api = await givenApi();
        await api.createShootout();
        const stream = await api.openEvents("shootout-1");
        await stream.next(1);

        await api.recordShot("shootout-1", 0);
        const [update] = await stream.next(1);

        expect(update).toMatchObject({ event: "shootout.updated", id: "1", data: { version: 1, score: { home: 1, away: 0 } } });
        expect(update?.data.shots).toHaveLength(1);
    });

    test("quand un tir est refusé puis un autre accepté, alors seul le tir accepté produit un événement", async () => {
        const api = await givenApi();
        await api.createShootout();
        const stream = await api.openEvents("shootout-1");
        await stream.next(1);

        await api.recordShot("shootout-1", 0, { team: "AWAY" });
        await api.recordShot("shootout-1", 0);
        const [update] = await stream.next(1);

        expect(update).toMatchObject({ id: "1", data: { version: 1 } });
    });

    test("quand le flux d'une séance inconnue est demandé, alors la réponse est 404 SHOOTOUT_NOT_FOUND", async () => {
        const api = await givenApi();

        const response = await api.request("GET", "/shootouts/inconnue/events");

        expect(response).toMatchObject({ status: 404, body: { error: { code: "SHOOTOUT_NOT_FOUND" } } });
    });
});

import { describe, expect, test } from "bun:test";
import { ShootoutNotFoundError } from "../../../domain/errors";
import { GetShootoutQuery } from "../../../application/queries/getShootout/getShootout.query";
import { aShootoutView } from "../../fixtures/shootout.fixtures";
import { givenViews } from "../../stubs/StubShootoutApplication";

describe("GetShootoutQueryHandler - étant donné la séance shootout-1 en lecture", () => {
    test("quand shootout-1 est demandée, alors sa représentation publique est renvoyée", async () => {
        const app = givenViews(aShootoutView());

        await app.getShootout(new GetShootoutQuery("shootout-1"));

        expect(app.result).toEqual(aShootoutView());
    });

    test("quand une séance inconnue est demandée, alors la requête est refusée avec SHOOTOUT_NOT_FOUND", async () => {
        const app = givenViews(aShootoutView());

        await app.getShootout(new GetShootoutQuery("inconnue"));

        expect(app.error).toBeInstanceOf(ShootoutNotFoundError);
    });
});

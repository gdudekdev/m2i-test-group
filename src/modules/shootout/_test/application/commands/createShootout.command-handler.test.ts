import { describe, expect, test } from "bun:test";
import { InvalidValueError } from "../../../../../shared/domain/DomainError";
import { aCreateShootoutCommand, CREATED_AT } from "../../fixtures/shootout.fixtures";
import { given } from "../../stubs/StubShootoutApplication";

describe("CreateShootoutCommandHandler - étant donné un dépôt vide", () => {
    test("quand une séance est créée, alors elle est enregistrée avec l'id et la date des ports", async () => {
        const app = given();

        await app.createShootout(aCreateShootoutCommand());

        expect(app.result).toEqual({ id: "shootout-1" });
        expect(app.stored()).toMatchObject({ status: "IN_PROGRESS", nextTeam: "HOME", version: 0, createdAt: CREATED_AT });
    });

    test("quand une séance est créée, alors ShootoutCreated est publié une fois la séance persistée", async () => {
        const app = given();

        await app.createShootout(aCreateShootoutCommand());

        expect(app.published()).toEqual([{ type: "ShootoutCreated", storedVersion: 0 }]);
    });

    test("quand le nom d'équipe est vide, alors la commande est refusée sans effet", async () => {
        const app = given();

        await app.createShootout(aCreateShootoutCommand({ homeTeam: "   " }));

        expect(app.error).toBeInstanceOf(InvalidValueError);
        expect(app.hasNoSideEffect()).toBe(true);
    });
});

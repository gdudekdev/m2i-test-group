import { describe, expect, test } from "bun:test";
import { VersionConflictError } from "../../../modules/shootout/application/errors";
import { NotTeamTurnError, ShootoutNotFoundError } from "../../../modules/shootout/domain/errors";
import { InvalidValueError } from "../../domain/DomainError";
import { InvalidRequestError, toHttpError } from "../toHttpError";

describe("toHttpError - étant donné une erreur levée par une couche", () => {
    test.each([
        ["une requête HTTP invalide", new InvalidRequestError("Invalid request body"), 400, "INVALID_REQUEST"],
        ["une valeur refusée par le domaine", new InvalidValueError("Team name must contain 1 to 80 characters."), 400, "INVALID_REQUEST"],
        ["une séance introuvable", new ShootoutNotFoundError("inconnue"), 404, "SHOOTOUT_NOT_FOUND"],
        ["un refus métier", new NotTeamTurnError("HOME"), 409, "NOT_TEAM_TURN"],
        ["un conflit de version applicatif", new VersionConflictError(), 409, "VERSION_CONFLICT"],
        ["une erreur inattendue", new Error("boom"), 500, "INTERNAL_ERROR"],
    ])("quand c'est %s, alors elle est traduite en %i %s", (_given, error, status, code) => {
        const raised = error;

        const response = toHttpError(raised);

        expect(response).toMatchObject({ status, body: { error: { code } } });
    });

    test("quand c'est une erreur inattendue, alors son message interne n'est pas exposé", () => {
        const raised = new Error("connexion SQL perdue");

        const response = toHttpError(raised);

        expect(response.body.error.message).toBe("Internal server error");
    });
});

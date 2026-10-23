import { ConflictError } from "../../../shared/application/errors";

export class VersionConflictError extends ConflictError {
    constructor() {
        super("VERSION_CONFLICT", "The shootout has changed since the expected version.");
    }
}

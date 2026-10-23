export class ConflictError extends Error {
    constructor(
        readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

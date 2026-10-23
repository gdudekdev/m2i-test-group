export class DomainError extends Error {
    constructor(
        readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class NotFoundError extends DomainError { }

export class InvalidValueError extends DomainError {
    constructor(message: string) {
        super("INVALID_VALUE", message);
    }
}

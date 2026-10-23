import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ConflictError } from "../application/errors";
import { DomainError, InvalidValueError, NotFoundError } from "../domain/DomainError";

export class InvalidRequestError extends Error {
  readonly code = "INVALID_REQUEST";

  constructor(message = "Invalid request") {
    super(message);
    this.name = "InvalidRequestError";
  }
}

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

function knownStatus(error: unknown): ContentfulStatusCode | undefined {
  if (error instanceof InvalidRequestError || error instanceof InvalidValueError) return 400;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError || error instanceof DomainError) return 409;
  return undefined;
}

function publicCode(error: unknown, details: { code?: unknown }): string {
  if (error instanceof InvalidValueError) return "INVALID_REQUEST";
  return typeof details.code === "string" ? details.code : "INTERNAL_ERROR";
}

export function toHttpError(error: unknown): {
  status: ContentfulStatusCode;
  body: ReturnType<typeof errorBody>;
} {
  const details =
    error !== null && typeof error === "object"
      ? (error as { status?: unknown; code?: unknown; message?: unknown })
      : {};
  const status =
    knownStatus(error) ??
    (typeof details.status === "number" &&
      details.status >= 400 &&
      details.status <= 599
      ? (details.status as ContentfulStatusCode)
      : 500);

  return {
    status,
    body: errorBody(
      publicCode(error, details),
      status === 500
        ? "Internal server error"
        : typeof details.message === "string"
          ? details.message
          : "Request failed",
    ),
  };
}

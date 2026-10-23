import type { Context } from "hono";
import type { ZodType } from "zod";
import { InvalidRequestError } from "./toHttpError";

export async function parseJsonBody<T>(
  context: Context,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new InvalidRequestError("Malformed JSON body");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new InvalidRequestError("Invalid request body");
  }
  return result.data;
}

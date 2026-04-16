import type { NotFoundHandler } from "hono";

import { toErrorPayload } from "../errors";
import { createErrorJson } from "../http";
import type { AppBindings } from "../app/types";

export function handleAppError(error: unknown, c: { get: (key: "traceId") => string | undefined; json: Function; }): Response {
  const traceId = c.get("traceId") ?? crypto.randomUUID();
  const payload = toErrorPayload(error, traceId);

  console.error(`[${traceId}]`, error);

  return c.json(
    createErrorJson(payload),
    payload.status as 400 | 404 | 413 | 415 | 500 | 503,
  );
}

export const handleNotFound: NotFoundHandler<AppBindings> = (c) =>
  c.json(
    {
      code: "NOT_FOUND",
      message: "That route does not exist.",
      traceId: c.get("traceId") ?? crypto.randomUUID(),
    },
    404 as const,
  );

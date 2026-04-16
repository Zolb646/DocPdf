import type { MiddlewareHandler } from "hono";

import type { AppBindings } from "../app/types";

export const requestContextMiddleware: MiddlewareHandler<AppBindings> = async (
  c,
  next,
) => {
  const traceId = crypto.randomUUID();
  c.set("traceId", traceId);
  await next();
  c.header("X-Trace-Id", traceId);
  c.header("Cache-Control", "no-store");
};

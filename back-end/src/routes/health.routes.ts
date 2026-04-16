import { Hono } from "hono";

import { resolveHealth } from "../resolvers/health.resolver";
import type { AppBindings, AppServices } from "../app/types";

export function createHealthRoutes(services: AppServices) {
  const router = new Hono<AppBindings>();

  router.get("/health", (c) => resolveHealth(c, services));

  return router;
}

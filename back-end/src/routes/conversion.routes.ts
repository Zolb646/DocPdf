import { Hono } from "hono";

import {
  resolveFileConversion,
  resolveUrlConversion,
} from "../resolvers/conversion.resolver";
import type { AppBindings, AppServices } from "../app/types";

export function createConversionRoutes(services: AppServices) {
  const router = new Hono<AppBindings>();

  router.post("/convert/file", (c) => resolveFileConversion(c, services));
  router.post("/convert/url", (c) => resolveUrlConversion(c, services));

  return router;
}

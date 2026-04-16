import { Hono } from "hono";

import type { AppBindings } from "../app/types";

export function createRootRoutes() {
  const router = new Hono<AppBindings>();

  router.get("/", (c) =>
    c.json({
      name: "DocPDF back-end",
      status: "ok",
    }),
  );

  return router;
}

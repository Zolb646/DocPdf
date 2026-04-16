import { Hono } from "hono";
import { cors } from "hono/cors";

import { type AppConfig } from "./config";
import {
  createAppServices,
  type AppBindings,
  type AppDependencies,
} from "./app/types";
import { handleAppError, handleNotFound } from "./middleware/error-handler";
import { requestContextMiddleware } from "./middleware/request-context";
import { createConversionRoutes } from "./routes/conversion.routes";
import { createHealthRoutes } from "./routes/health.routes";
import { createRootRoutes } from "./routes/root.routes";

export function createApp(config: AppConfig, dependencies: AppDependencies = {}) {
  const app = new Hono<AppBindings>();
  const services = createAppServices(config, dependencies);

  app.use("/api/*", requestContextMiddleware);

  app.use(
    "/api/*",
    cors({
      origin: config.corsOrigin,
      allowHeaders: ["Content-Type"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      exposeHeaders: ["Content-Disposition", "X-Trace-Id"],
      maxAge: 86400,
    }),
  );

  app.route("/", createRootRoutes());
  app.route("/api", createHealthRoutes(services));
  app.route("/api", createConversionRoutes(services));

  app.onError(handleAppError);
  app.notFound(handleNotFound);

  return app;
}

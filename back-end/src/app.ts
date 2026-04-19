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

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function matchesWildcardOrigin(origin: string, pattern: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):\/\/\*\.([^/:]+)(?::(\d+))?$/i.exec(pattern);

  if (!match) {
    return false;
  }

  const [, protocol, hostnameSuffix, port] = match;

  let requestOrigin: URL;

  try {
    requestOrigin = new URL(origin);
  } catch {
    return false;
  }

  if (requestOrigin.protocol !== `${protocol.toLowerCase()}:`) {
    return false;
  }

  if (port && requestOrigin.port !== port) {
    return false;
  }

  if (!port && requestOrigin.port) {
    return false;
  }

  return requestOrigin.hostname.endsWith(`.${hostnameSuffix.toLowerCase()}`);
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOrigins.some((allowedOrigin) => {
    const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);

    if (normalizedAllowedOrigin === "*") {
      return true;
    }

    if (normalizedAllowedOrigin.includes("*")) {
      return matchesWildcardOrigin(normalizedOrigin, normalizedAllowedOrigin);
    }

    return normalizedOrigin === normalizedAllowedOrigin;
  });
}

export function createApp(config: AppConfig, dependencies: AppDependencies = {}) {
  const app = new Hono<AppBindings>();
  const services = createAppServices(config, dependencies);

  app.use("/api/*", requestContextMiddleware);

  app.use(
    "/api/*",
    cors({
      origin: (origin) =>
        isAllowedOrigin(origin, config.corsOrigins) ? origin : undefined,
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

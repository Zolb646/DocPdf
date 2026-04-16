import type { Context } from "hono";

import type { AppConfig } from "../config";
import { ConversionService } from "../conversion-service";
import { type FetchImpl, GotenbergClient } from "../gotenberg";

export interface AppBindings {
  Variables: {
    traceId: string;
  };
}

export type AppContext = Context<AppBindings>;

export interface AppDependencies {
  gotenbergFetch?: FetchImpl;
}

export interface AppServices {
  config: AppConfig;
  gotenberg: GotenbergClient;
  conversionService: ConversionService;
}

export function createAppServices(
  config: AppConfig,
  dependencies: AppDependencies = {},
): AppServices {
  const gotenberg = new GotenbergClient({
    baseUrl: config.gotenbergUrl,
    fetchImpl: dependencies.gotenbergFetch,
    timeoutMs: config.requestTimeoutMs,
  });

  return {
    config,
    gotenberg,
    conversionService: new ConversionService({
      gotenberg,
      maxUploadSizeBytes: config.maxUploadSizeBytes,
      tempRoot: config.tempRoot,
    }),
  };
}

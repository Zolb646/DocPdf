import { join } from "node:path";
import { tmpdir } from "node:os";

export interface AppConfig {
  port: number;
  gotenbergUrl: string;
  corsOrigin: string;
  maxUploadSizeBytes: number;
  requestTimeoutMs: number;
  tempRoot: string;
}

function parsePositiveInt(
  rawValue: string | undefined,
  fallback: number,
): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function loadConfig(): AppConfig {
  return {
    port: parsePositiveInt(process.env.PORT, 8787),
    gotenbergUrl: trimTrailingSlash(
      process.env.GOTENBERG_URL ?? "http://gotenberg:3000",
    ),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    maxUploadSizeBytes: parsePositiveInt(
      process.env.MAX_UPLOAD_SIZE_BYTES,
      25 * 1024 * 1024,
    ),
    requestTimeoutMs: parsePositiveInt(process.env.REQUEST_TIMEOUT_MS, 60_000),
    tempRoot: process.env.TEMP_ROOT ?? join(tmpdir(), "docpdf"),
  };
}

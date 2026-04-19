import { join } from "node:path";
import { tmpdir } from "node:os";

export interface AppConfig {
  port: number;
  gotenbergUrl: string;
  corsOrigins: string[];
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

function normalizeHttpUrl(value: string): string {
  const trimmed = trimTrailingSlash(value.trim());

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}

function parseOriginList(rawValue: string | undefined): string[] {
  const values = (rawValue ?? "http://localhost:3000")
    .split(",")
    .map((value) => trimTrailingSlash(value.trim()))
    .filter(Boolean);

  return values.length > 0 ? values : ["http://localhost:3000"];
}

export function loadConfig(): AppConfig {
  return {
    port: parsePositiveInt(process.env.PORT, 8787),
    gotenbergUrl: normalizeHttpUrl(
      process.env.GOTENBERG_URL ?? "http://gotenberg:3000",
    ),
    corsOrigins: parseOriginList(process.env.CORS_ORIGIN),
    maxUploadSizeBytes: parsePositiveInt(
      process.env.MAX_UPLOAD_SIZE_BYTES,
      25 * 1024 * 1024,
    ),
    requestTimeoutMs: parsePositiveInt(process.env.REQUEST_TIMEOUT_MS, 60_000),
    tempRoot: process.env.TEMP_ROOT ?? join(tmpdir(), "docpdf"),
  };
}

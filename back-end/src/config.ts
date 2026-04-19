import { join } from "node:path";
import { tmpdir } from "node:os";

import type {
  ChromiumEmulatedMediaType,
  ChromiumRenderDefaults,
} from "./gotenberg";

export interface AppConfig {
  port: number;
  gotenbergUrl: string;
  corsOrigins: string[];
  maxUploadSizeBytes: number;
  requestTimeoutMs: number;
  tempRoot: string;
  chromium: ChromiumRenderDefaults;
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

function parseBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseOptionalString(rawValue: string | undefined): string | undefined {
  const trimmed = rawValue?.trim();
  return trimmed ? trimmed : undefined;
}

function parseEmulatedMediaType(
  rawValue: string | undefined,
): ChromiumEmulatedMediaType {
  const normalized = rawValue?.trim().toLowerCase();

  return normalized === "print" || normalized === "screen"
    ? normalized
    : "screen";
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
    chromium: {
      emulatedMediaType: parseEmulatedMediaType(
        process.env.CHROMIUM_EMULATED_MEDIA_TYPE,
      ),
      printBackground: parseBoolean(
        process.env.CHROMIUM_PRINT_BACKGROUND,
        true,
      ),
      skipNetworkAlmostIdleEvent: parseBoolean(
        process.env.CHROMIUM_SKIP_NETWORK_ALMOST_IDLE_EVENT,
        false,
      ),
      waitDelay: parseOptionalString(process.env.CHROMIUM_WAIT_DELAY),
      failOnResourceLoadingFailed: parseBoolean(
        process.env.CHROMIUM_FAIL_ON_RESOURCE_LOADING_FAILED,
        false,
      ),
    },
  };
}

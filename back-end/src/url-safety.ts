import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { AppError } from "./errors";

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "host.docker.internal",
]);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:172.16.") ||
    normalized.startsWith("::ffff:172.17.") ||
    normalized.startsWith("::ffff:172.18.") ||
    normalized.startsWith("::ffff:172.19.") ||
    normalized.startsWith("::ffff:172.2") ||
    normalized.startsWith("::ffff:172.30.") ||
    normalized.startsWith("::ffff:172.31.")
  );
}

function assertPublicIp(address: string): void {
  const type = isIP(address);

  if (type === 4 && isPrivateIpv4(address)) {
    throw new AppError(
      400,
      "PRIVATE_URL",
      "Only public http:// or https:// URLs are allowed.",
    );
  }

  if (type === 6 && isPrivateIpv6(address)) {
    throw new AppError(
      400,
      "PRIVATE_URL",
      "Only public http:// or https:// URLs are allowed.",
    );
  }
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new AppError(
      400,
      "INVALID_URL",
      "Enter a valid public http:// or https:// URL.",
    );
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new AppError(
      400,
      "INVALID_URL",
      "Enter a valid public http:// or https:// URL.",
    );
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new AppError(
      400,
      "INVALID_URL",
      "Authenticated URLs are out of scope for this first release.",
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new AppError(
      400,
      "PRIVATE_URL",
      "Only public http:// or https:// URLs are allowed.",
    );
  }

  if (isIP(hostname)) {
    assertPublicIp(hostname);
    return parsedUrl;
  }

  let resolvedAddresses;

  try {
    resolvedAddresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError(
      400,
      "INVALID_URL",
      "We could not resolve that URL to a public address.",
    );
  }

  if (resolvedAddresses.length === 0) {
    throw new AppError(
      400,
      "INVALID_URL",
      "We could not resolve that URL to a public address.",
    );
  }

  for (const entry of resolvedAddresses) {
    assertPublicIp(entry.address);
  }

  return parsedUrl;
}

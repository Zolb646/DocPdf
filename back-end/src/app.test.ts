import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import AdmZip from "adm-zip";

import { createApp } from "./app";
import { type AppConfig } from "./config";

async function createTempRoot() {
  return mkdtemp(join(tmpdir(), "docpdf-test-"));
}

function createConfig(tempRoot: string): AppConfig {
  return {
    port: 8787,
    gotenbergUrl: "http://gotenberg:3000",
    corsOrigins: ["http://localhost:3000"],
    maxUploadSizeBytes: 25 * 1024 * 1024,
    requestTimeoutMs: 60_000,
    tempRoot,
    chromium: {
      emulatedMediaType: "screen",
      printBackground: true,
      skipNetworkAlmostIdleEvent: false,
      failOnResourceLoadingFailed: false,
    },
  };
}

describe("DocPDF API", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("rejects private URLs", async () => {
    const tempRoot = await createTempRoot();
    tempRoots.push(tempRoot);
    const app = createApp(createConfig(tempRoot), {
      gotenbergFetch: async () =>
        new Response(null, {
          status: 500,
        }),
    });

    const response = await app.request("/api/convert/url", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: "http://localhost:3000/private" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "PRIVATE_URL",
    });
  });

  it("rejects unsupported uploads", async () => {
    const tempRoot = await createTempRoot();
    tempRoots.push(tempRoot);
    const app = createApp(createConfig(tempRoot), {
      gotenbergFetch: async () =>
        new Response(null, {
          status: 500,
        }),
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(["echo"], "script.sh", { type: "text/x-shellscript" }),
    );

    const response = await app.request("/api/convert/file", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
    });
  });

  it("converts HTML files through the Chromium route and cleans temp files", async () => {
    const tempRoot = await createTempRoot();
    tempRoots.push(tempRoot);
    let receivedFiles: string[] = [];
    let receivedTrace = "";

    const app = createApp(createConfig(tempRoot), {
      gotenbergFetch: async (_input, init) => {
        const formData = init?.body as FormData;
        receivedFiles = formData.getAll("files").map((file) => (file as File).name);
        receivedTrace = new Headers(init?.headers).get("Gotenberg-Trace") ?? "";

        return new Response("%PDF-1.7", {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="landing-page.pdf"',
          },
        });
      },
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(["<html><body>Hello</body></html>"], "marketing.html", {
        type: "text/html",
      }),
    );

    const response = await app.request("/api/convert/file", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("landing-page.pdf");
    expect(receivedFiles).toEqual(["index.html"]);
    expect(receivedTrace.length).toBeGreaterThan(10);
    expect(await response.text()).toBe("%PDF-1.7");
    expect(await readdir(tempRoot)).toEqual([]);
  });

  it("returns friendly JSON when the renderer responds with an HTML error page", async () => {
    const tempRoot = await createTempRoot();
    tempRoots.push(tempRoot);
    const app = createApp(createConfig(tempRoot), {
      gotenbergFetch: async () =>
        new Response("<!doctype html><html><body>renderer down</body></html>", {
          status: 500,
          headers: {
            "Content-Type": "text/html",
          },
        }),
    });

    const response = await app.request("/api/convert/url", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: "https://example.com/report" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(payload).toMatchObject({
      code: "RENDERER_UNAVAILABLE",
      message:
        "The PDF renderer is unavailable right now. Please try again in a moment.",
    });
    expect(typeof payload.traceId).toBe("string");
    expect(payload.traceId.length).toBeGreaterThan(10);
    expect(payload.message).not.toContain("<html");
  });

  it("rejects nested ZIP bundles", async () => {
    const tempRoot = await createTempRoot();
    tempRoots.push(tempRoot);
    const app = createApp(createConfig(tempRoot), {
      gotenbergFetch: async () =>
        new Response("%PDF-1.7", {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
          },
        }),
    });
    const archive = new AdmZip();
    archive.addFile("nested/index.html", Buffer.from("<html></html>"));
    const zipBytes = archive.toBuffer();

    const formData = new FormData();
    formData.append(
      "file",
      new File([zipBytes], "bundle.zip", { type: "application/zip" }),
    );

    const response = await app.request("/api/convert/file", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "INVALID_ARCHIVE",
    });
  });

  it("reports renderer health", async () => {
    const tempRoot = await createTempRoot();
    tempRoots.push(tempRoot);
    const app = createApp(createConfig(tempRoot), {
      gotenbergFetch: async () =>
        new Response(JSON.stringify({ status: "up" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    });

    const response = await app.request("/api/health");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      renderer: {
        ok: true,
        status: 200,
      },
    });
  });

  it("allows configured CORS origins", async () => {
    const tempRoot = await createTempRoot();
    tempRoots.push(tempRoot);
    const config = createConfig(tempRoot);
    config.corsOrigins = [
      "http://localhost:3000",
      "https://docpdf.vercel.app",
      "https://*.vercel.app",
    ];

    const app = createApp(config, {
      gotenbergFetch: async () =>
        new Response(JSON.stringify({ status: "up" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    });

    const exactResponse = await app.request("/api/health", {
      headers: {
        Origin: "https://docpdf.vercel.app",
      },
    });

    expect(exactResponse.headers.get("access-control-allow-origin")).toBe(
      "https://docpdf.vercel.app",
    );

    const wildcardResponse = await app.request("/api/health", {
      headers: {
        Origin: "https://docpdf-git-feature-user.vercel.app",
      },
    });

    expect(wildcardResponse.headers.get("access-control-allow-origin")).toBe(
      "https://docpdf-git-feature-user.vercel.app",
    );

    const blockedResponse = await app.request("/api/health", {
      headers: {
        Origin: "https://evil.example.com",
      },
    });

    expect(blockedResponse.headers.get("access-control-allow-origin")).toBeNull();
  });
});

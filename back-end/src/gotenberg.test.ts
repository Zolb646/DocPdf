import { describe, expect, it } from "bun:test";

import { AppError } from "./errors";
import { GotenbergClient } from "./gotenberg";

type FetchHandler = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

async function expectAppError(
  promise: Promise<unknown>,
  expected: { status: number; code: string; message: string },
) {
  try {
    await promise;
    throw new Error("Expected conversion to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject(expected);
  }
}

function createClient(fetchHandler?: FetchHandler) {
  const calls: RequestInit[] = [];
  const client = new GotenbergClient({
    baseUrl: "http://gotenberg:3000",
    chromium: {
      emulatedMediaType: "screen",
      printBackground: true,
      skipNetworkAlmostIdleEvent: false,
      waitDelay: "750ms",
      failOnResourceLoadingFailed: false,
    },
    timeoutMs: 60_000,
    fetchImpl: async (input, init) => {
      calls.push(init ?? {});

      if (fetchHandler) {
        return fetchHandler(input, init);
      }

      return new Response("%PDF-1.7", {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
        },
      });
    },
  });

  return { client, calls };
}

function getFormDataValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

describe("GotenbergClient Chromium defaults", () => {
  it("applies configured defaults to URL conversions", async () => {
    const { client, calls } = createClient();

    await client.convertUrl("https://example.com", "trace-123", "example");

    const formData = calls[0]?.body as FormData;

    expect(getFormDataValue(formData, "url")).toBe("https://example.com");
    expect(getFormDataValue(formData, "emulatedMediaType")).toBe("screen");
    expect(getFormDataValue(formData, "printBackground")).toBe("true");
    expect(getFormDataValue(formData, "skipNetworkAlmostIdleEvent")).toBe("false");
    expect(getFormDataValue(formData, "waitDelay")).toBe("750ms");
    expect(getFormDataValue(formData, "failOnResourceLoadingFailed")).toBe("false");
  });

  it("applies configured defaults to HTML conversions", async () => {
    const { client, calls } = createClient();
    const file = new File(["<html></html>"], "index.html", { type: "text/html" });

    await client.convertHtml([file], "trace-123", "example");

    const formData = calls[0]?.body as FormData;

    expect((formData.get("files") as File).name).toBe("index.html");
    expect(getFormDataValue(formData, "emulatedMediaType")).toBe("screen");
    expect(getFormDataValue(formData, "printBackground")).toBe("true");
    expect(getFormDataValue(formData, "skipNetworkAlmostIdleEvent")).toBe("false");
    expect(getFormDataValue(formData, "waitDelay")).toBe("750ms");
    expect(getFormDataValue(formData, "failOnResourceLoadingFailed")).toBe("false");
  });

  it("applies configured defaults to Markdown conversions", async () => {
    const { client, calls } = createClient();
    const file = new File(["# Hello"], "page.md", { type: "text/markdown" });

    await client.convertMarkdown([file], "trace-123", "example");

    const formData = calls[0]?.body as FormData;

    expect((formData.get("files") as File).name).toBe("page.md");
    expect(getFormDataValue(formData, "emulatedMediaType")).toBe("screen");
    expect(getFormDataValue(formData, "printBackground")).toBe("true");
    expect(getFormDataValue(formData, "skipNetworkAlmostIdleEvent")).toBe("false");
    expect(getFormDataValue(formData, "waitDelay")).toBe("750ms");
    expect(getFormDataValue(formData, "failOnResourceLoadingFailed")).toBe("false");
  });

  it("leaves LibreOffice conversions unchanged", async () => {
    const { client, calls } = createClient();
    const file = new File(["hello"], "document.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await client.convertOffice(file, "trace-123", "example");

    const formData = calls[0]?.body as FormData;

    expect((formData.get("files") as File).name).toBe("document.docx");
    expect(formData.get("emulatedMediaType")).toBeNull();
    expect(formData.get("printBackground")).toBeNull();
    expect(formData.get("skipNetworkAlmostIdleEvent")).toBeNull();
    expect(formData.get("waitDelay")).toBeNull();
    expect(formData.get("failOnResourceLoadingFailed")).toBeNull();
  });

  it("normalizes HTML renderer failures from 5xx responses", async () => {
    const { client } = createClient(async () => {
      return new Response("<!doctype html><html><body>renderer down</body></html>", {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      });
    });

    await expectAppError(
      client.convertUrl("https://example.com", "trace-123", "example"),
      {
        status: 503,
        code: "RENDERER_UNAVAILABLE",
        message:
          "The PDF renderer is unavailable right now. Please try again in a moment.",
      },
    );
  });

  it("normalizes HTML renderer failures from 4xx responses", async () => {
    const { client } = createClient(async () => {
      return new Response("<html><body>bad request</body></html>", {
        status: 400,
        headers: {
          "Content-Type": "text/html",
        },
      });
    });
    const file = new File(["<html></html>"], "index.html", { type: "text/html" });

    await expectAppError(client.convertHtml([file], "trace-123", "example"), {
      status: 400,
      code: "CONVERSION_FAILED",
      message:
        "The renderer could not process this file or page. Check the input and try again.",
    });
  });

  it("normalizes plain-text renderer failures to friendly copy", async () => {
    const { client } = createClient(async () => {
      return new Response("invalid office conversion payload", {
        status: 422,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    });
    const file = new File(["hello"], "document.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expectAppError(client.convertOffice(file, "trace-123", "example"), {
      status: 400,
      code: "CONVERSION_FAILED",
      message:
        "The renderer could not process this file or page. Check the input and try again.",
    });
  });
});

import { describe, expect, it } from "bun:test";

import { GotenbergClient } from "./gotenberg";

function createClient() {
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
    fetchImpl: async (_input, init) => {
      calls.push(init ?? {});

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
});

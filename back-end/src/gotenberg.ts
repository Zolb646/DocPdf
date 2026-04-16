import { AppError } from "./errors";

export type FetchImpl = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface HealthResult {
  ok: boolean;
  status: number;
  details: unknown;
}

export interface GotenbergClientOptions {
  baseUrl: string;
  fetchImpl?: FetchImpl;
  timeoutMs: number;
}

function trimPdfExtension(value: string): string {
  return value.replace(/\.pdf$/i, "");
}

async function readErrorText(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text || "Conversion failed in the PDF renderer.";
  } catch {
    return "Conversion failed in the PDF renderer.";
  }
}

export class GotenbergClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchImpl;
  private readonly timeoutMs: number;

  constructor(options: GotenbergClientOptions) {
    this.baseUrl = options.baseUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs;
  }

  async getHealth(traceId: string): Promise<HealthResult> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/health`, {
        headers: {
          "Gotenberg-Trace": traceId,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      let details: unknown = null;

      try {
        details = await response.json();
      } catch {
        details = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        details,
      };
    } catch {
      return {
        ok: false,
        status: 503,
        details: null,
      };
    }
  }

  async convertUrl(url: string, traceId: string, outputBaseName: string) {
    const formData = new FormData();
    formData.set("url", url);

    return this.sendPdfRequest(
      "/forms/chromium/convert/url",
      formData,
      traceId,
      outputBaseName,
    );
  }

  async convertHtml(files: File[], traceId: string, outputBaseName: string) {
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file, file.name);
    }

    return this.sendPdfRequest(
      "/forms/chromium/convert/html",
      formData,
      traceId,
      outputBaseName,
    );
  }

  async convertMarkdown(files: File[], traceId: string, outputBaseName: string) {
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file, file.name);
    }

    return this.sendPdfRequest(
      "/forms/chromium/convert/markdown",
      formData,
      traceId,
      outputBaseName,
    );
  }

  async convertOffice(file: File, traceId: string, outputBaseName: string) {
    const formData = new FormData();
    formData.append("files", file, file.name);

    return this.sendPdfRequest(
      "/forms/libreoffice/convert",
      formData,
      traceId,
      outputBaseName,
    );
  }

  private async sendPdfRequest(
    pathname: string,
    body: FormData,
    traceId: string,
    outputBaseName: string,
  ): Promise<Response> {
    let response: Response;

    try {
      response = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
        method: "POST",
        headers: {
          "Gotenberg-Trace": traceId,
          "Gotenberg-Output-Filename": trimPdfExtension(outputBaseName),
        },
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new AppError(
        503,
        "RENDERER_UNAVAILABLE",
        "The PDF renderer is unavailable right now. Please try again in a moment.",
      );
    }

    if (!response.ok) {
      const message = await readErrorText(response);

      throw new AppError(
        response.status >= 500 ? 503 : 400,
        response.status >= 500 ? "RENDERER_UNAVAILABLE" : "CONVERSION_FAILED",
        message,
      );
    }

    return response;
  }
}

import { extname, parse } from "node:path";

import { AppError } from "./errors";
import {
  createPdfBaseName,
  extractFlatHtmlBundle,
  getFormatForFile,
  loadStoredFileAsWebFile,
  persistUploadedFile,
  withTempWorkspace,
} from "./files";
import { GotenbergClient } from "./gotenberg";

const MARKDOWN_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markdown Conversion</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Inter", "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        padding: 48px;
        color: #172033;
        background: #fffdf9;
        line-height: 1.6;
      }

      img {
        max-width: 100%;
      }

      pre {
        overflow-x: auto;
        padding: 16px;
        border-radius: 16px;
        background: #f4eee4;
      }

      code {
        font-family: "SFMono-Regular", "Consolas", monospace;
      }
    </style>
  </head>
  <body>
    {{ toHTML "__MARKDOWN_FILE__" }}
  </body>
</html>
`;

export interface ConversionServiceOptions {
  gotenberg: GotenbergClient;
  maxUploadSizeBytes: number;
  tempRoot: string;
}

export class ConversionService {
  constructor(private readonly options: ConversionServiceOptions) {}

  async convertFile(file: File, traceId: string): Promise<Response> {
    if (!(file instanceof File)) {
      throw new AppError(
        400,
        "INVALID_FILE_UPLOAD",
        "Upload exactly one file to convert.",
      );
    }

    if (!file.name) {
      throw new AppError(
        400,
        "INVALID_FILE_UPLOAD",
        "Uploaded files must include a filename.",
      );
    }

    if (file.size === 0) {
      throw new AppError(
        400,
        "INVALID_FILE_UPLOAD",
        "Uploaded files must not be empty.",
      );
    }

    if (file.size > this.options.maxUploadSizeBytes) {
      throw new AppError(
        413,
        "FILE_TOO_LARGE",
        "The uploaded file is larger than the 25 MB limit.",
      );
    }

    const format = getFormatForFile(file);
    const outputBaseName = createPdfBaseName(file.name);

    return withTempWorkspace(this.options.tempRoot, traceId, async (workspace) => {
      switch (format.target) {
        case "chromium-html":
          return this.convertHtmlVariant(file, traceId, outputBaseName, workspace);
        case "chromium-markdown":
          return this.convertMarkdown(file, traceId, outputBaseName, workspace);
        case "libreoffice":
          return this.convertOffice(file, traceId, outputBaseName, workspace);
        default:
          return this.assertNever(format.target);
      }
    });
  }

  async convertUrl(inputUrl: string, traceId: string): Promise<Response> {
    const normalizedUrl = new URL(inputUrl);
    const hostnameBaseName = createPdfBaseName(normalizedUrl.hostname);

    return this.options.gotenberg.convertUrl(
      normalizedUrl.toString(),
      traceId,
      hostnameBaseName,
    );
  }

  private async convertHtmlVariant(
    file: File,
    traceId: string,
    outputBaseName: string,
    workspace: string,
  ): Promise<Response> {
    const extension = extname(file.name).toLowerCase();

    if (extension === ".zip") {
      const storedFiles = await extractFlatHtmlBundle(file, workspace);
      const uploadFiles = await Promise.all(
        storedFiles.map((storedFile) => loadStoredFileAsWebFile(storedFile)),
      );

      return this.options.gotenberg.convertHtml(
        uploadFiles,
        traceId,
        outputBaseName,
      );
    }

    const storedFile = await persistUploadedFile(workspace, file, "index.html");
    const uploadFile = await loadStoredFileAsWebFile(storedFile);

    return this.options.gotenberg.convertHtml([uploadFile], traceId, outputBaseName);
  }

  private async convertMarkdown(
    file: File,
    traceId: string,
    outputBaseName: string,
    workspace: string,
  ): Promise<Response> {
    const markdownFilename = parse(file.name).base;
    const markdownFile = await persistUploadedFile(workspace, file, markdownFilename);
    const templateFile = new File(
      [MARKDOWN_TEMPLATE.replace("__MARKDOWN_FILE__", markdownFilename)],
      "index.html",
      { type: "text/html" },
    );
    const storedTemplate = await persistUploadedFile(workspace, templateFile, "index.html");

    const uploadFiles = await Promise.all([
      loadStoredFileAsWebFile(storedTemplate),
      loadStoredFileAsWebFile(markdownFile),
    ]);

    return this.options.gotenberg.convertMarkdown(
      uploadFiles,
      traceId,
      outputBaseName,
    );
  }

  private async convertOffice(
    file: File,
    traceId: string,
    outputBaseName: string,
    workspace: string,
  ): Promise<Response> {
    const storedFile = await persistUploadedFile(workspace, file);
    const uploadFile = await loadStoredFileAsWebFile(storedFile);

    return this.options.gotenberg.convertOffice(uploadFile, traceId, outputBaseName);
  }

  private assertNever(value: never): never {
    throw new AppError(
      500,
      "UNSUPPORTED_ROUTE",
      `Unhandled conversion target: ${value}`,
    );
  }
}

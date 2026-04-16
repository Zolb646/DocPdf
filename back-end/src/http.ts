import { AppError, type ErrorPayload } from "./errors";

export function contentLengthExceedsLimit(
  contentLengthHeader: string | undefined,
  limit: number,
): boolean {
  if (!contentLengthHeader) {
    return false;
  }

  const size = Number.parseInt(contentLengthHeader, 10);
  return Number.isFinite(size) && size > limit + 1024 * 1024;
}

export function setTraceHeaders(headers: Headers, traceId: string): void {
  headers.set("Cache-Control", "no-store");
  headers.set("X-Trace-Id", traceId);
}

export function createPdfResponse(
  rendererResponse: Response,
  traceId: string,
  fallbackFilename: string,
): Response {
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition":
      rendererResponse.headers.get("Content-Disposition") ??
      `attachment; filename="${fallbackFilename}"`,
  });

  setTraceHeaders(headers, traceId);

  return new Response(rendererResponse.body, {
    status: 200,
    headers,
  });
}

export function collectUploadedFiles(formData: FormData): File[] {
  const uploadedFiles: File[] = [];

  for (const [, value] of formData.entries()) {
    if (typeof value !== "string") {
      uploadedFiles.push(value);
    }
  }

  return uploadedFiles;
}

export function assertSingleUploadedFile(files: File[]): File {
  if (files.length !== 1) {
    throw new AppError(
      400,
      "INVALID_FILE_UPLOAD",
      "Upload exactly one file to convert.",
    );
  }

  return files[0];
}

export function createErrorJson(
  payload: ErrorPayload,
): { code: string; message: string; traceId: string } {
  return {
    code: payload.code,
    message: payload.message,
    traceId: payload.traceId,
  };
}

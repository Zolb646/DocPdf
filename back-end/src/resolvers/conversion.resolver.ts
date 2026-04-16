import { AppError } from "../errors";
import {
  assertSingleUploadedFile,
  collectUploadedFiles,
  contentLengthExceedsLimit,
  createPdfResponse,
} from "../http";
import { assertSafePublicUrl } from "../url-safety";
import type { AppContext, AppServices } from "../app/types";

export async function resolveUrlConversion(
  c: AppContext,
  services: AppServices,
): Promise<Response> {
  const traceId = c.get("traceId");

  let payload: { url?: string };

  try {
    payload = await c.req.json();
  } catch {
    throw new AppError(
      400,
      "INVALID_JSON",
      "Send a JSON body shaped like { \"url\": \"https://example.com\" }.",
    );
  }

  const rawUrl = payload.url?.trim();

  if (!rawUrl) {
    throw new AppError(
      400,
      "INVALID_URL",
      "Enter a valid public http:// or https:// URL.",
    );
  }

  const safeUrl = await assertSafePublicUrl(rawUrl);
  const rendererResponse = await services.conversionService.convertUrl(
    safeUrl.toString(),
    traceId,
  );

  return createPdfResponse(
    rendererResponse,
    traceId,
    `${safeUrl.hostname}.pdf`,
  );
}

export async function resolveFileConversion(
  c: AppContext,
  services: AppServices,
): Promise<Response> {
  const traceId = c.get("traceId");

  if (
    contentLengthExceedsLimit(
      c.req.header("content-length"),
      services.config.maxUploadSizeBytes,
    )
  ) {
    throw new AppError(
      413,
      "FILE_TOO_LARGE",
      "The uploaded file is larger than the 25 MB limit.",
    );
  }

  const formData = await c.req.formData();
  const uploadedFile = assertSingleUploadedFile(collectUploadedFiles(formData));
  const rendererResponse = await services.conversionService.convertFile(
    uploadedFile,
    traceId,
  );
  const outputBaseName =
    uploadedFile.name.replace(/\.[^.]+$/, "") || "converted-file";

  return createPdfResponse(
    rendererResponse,
    traceId,
    `${outputBaseName}.pdf`,
  );
}

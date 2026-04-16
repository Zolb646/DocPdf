import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, parse } from "node:path";

import AdmZip from "adm-zip";

import { AppError } from "./errors";
import { FORMAT_BY_EXTENSION, type SupportedFormat } from "./supported-formats";

export interface StoredFile {
  filename: string;
  path: string;
  type: string;
}

export async function withTempWorkspace<T>(
  tempRoot: string,
  traceId: string,
  handler: (workspaceRoot: string) => Promise<T>,
): Promise<T> {
  const workspaceRoot = join(tempRoot, traceId);
  await mkdir(workspaceRoot, { recursive: true });

  try {
    return await handler(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export function createPdfBaseName(filename: string): string {
  const parsed = parse(filename);
  const clean = sanitizeSegment(parsed.name || "converted-file")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return clean || "converted-file";
}

export function getFormatForFile(file: File): SupportedFormat {
  const extension = extname(file.name).toLowerCase();
  const format = FORMAT_BY_EXTENSION.get(extension);

  if (!format) {
    throw new AppError(
      415,
      "UNSUPPORTED_FILE_TYPE",
      "Unsupported file type. Upload HTML, ZIP HTML bundles, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, or TXT.",
    );
  }

  const normalizedType = file.type.split(";")[0].trim().toLowerCase();

  if (
    normalizedType &&
    format.mimeTypes.length > 0 &&
    !format.mimeTypes.includes(normalizedType)
  ) {
    throw new AppError(
      415,
      "UNSUPPORTED_FILE_TYPE",
      `The uploaded file does not match the expected ${format.label} file type.`,
    );
  }

  return format;
}

export async function persistUploadedFile(
  workspaceRoot: string,
  file: File,
  overrideFilename?: string,
): Promise<StoredFile> {
  const filename = sanitizeSegment(
    overrideFilename ?? basename(file.name),
  );
  const destination = join(workspaceRoot, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, bytes);

  return {
    filename,
    path: destination,
    type: file.type,
  };
}

export async function loadStoredFileAsWebFile(storedFile: StoredFile): Promise<File> {
  const bytes = await readFile(storedFile.path);

  return new File([bytes], storedFile.filename, {
    type: storedFile.type || undefined,
  });
}

export async function extractFlatHtmlBundle(
  zipFile: File,
  workspaceRoot: string,
): Promise<StoredFile[]> {
  const archivePath = join(workspaceRoot, "bundle.zip");
  await writeFile(archivePath, Buffer.from(await zipFile.arrayBuffer()));

  const archive = new AdmZip(archivePath);
  const entries = archive.getEntries();

  if (entries.length === 0) {
    throw new AppError(
      400,
      "INVALID_ARCHIVE",
      "ZIP bundles must include a root-level index.html file.",
    );
  }

  let hasIndex = false;
  const storedFiles: StoredFile[] = [];

  for (const entry of entries) {
    const entryName = entry.entryName.replace(/\\/g, "/");

    if (entry.isDirectory || entryName.includes("/")) {
      throw new AppError(
        400,
        "INVALID_ARCHIVE",
        "ZIP bundles must only contain root-level files. Nested folders are not supported in v1.",
      );
    }

    const cleanName = sanitizeSegment(entryName);
    const destination = join(workspaceRoot, cleanName);
    await writeFile(destination, entry.getData());

    storedFiles.push({
      filename: cleanName,
      path: destination,
      type: "",
    });

    if (cleanName.toLowerCase() === "index.html") {
      hasIndex = true;
    }
  }

  if (!hasIndex) {
    throw new AppError(
      400,
      "INVALID_ARCHIVE",
      "ZIP bundles must include a root-level index.html file.",
    );
  }

  return storedFiles;
}

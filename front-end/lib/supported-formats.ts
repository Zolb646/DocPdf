export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787").replace(
    /\/+$/,
    "",
  );

export const ACCEPTED_FILE_TYPES = [
  ".html",
  ".htm",
  ".zip",
  ".docx",
  ".xlsx",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
  ".rtf",
  ".txt",
].join(",");

export const PUBLIC_FILE_EXTENSIONS = new Set(
  ACCEPTED_FILE_TYPES.split(",").map((value) => value.toLowerCase()),
);

export const FORMAT_GROUPS = [
  {
    title: "Web Sources",
    items: [
      "Public URLs via http:// or https://",
      "Standalone HTML or HTM files",
      "Flat ZIP bundles with root-level index.html plus root-level assets",
    ],
  },
  {
    title: "Working Documents",
    items: [
      "DOCX, XLSX, and PPTX",
      "ODT, ODS, and ODP",
      "RTF and TXT",
    ],
  },
] as const;

export const RAILS = [
  "One file per conversion",
  "25 MB upload limit",
  "Public URLs only, no localhost or private networks",
  "Ephemeral processing with no saved history",
] as const;

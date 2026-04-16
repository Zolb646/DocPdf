export type ConversionTarget =
  | "chromium-html"
  | "chromium-markdown"
  | "libreoffice";

export interface SupportedFormat {
  extension: string;
  target: ConversionTarget;
  public: boolean;
  label: string;
  description: string;
  mimeTypes: string[];
}

export const SUPPORTED_FORMATS: SupportedFormat[] = [
  {
    extension: ".html",
    target: "chromium-html",
    public: true,
    label: "HTML",
    description: "Standalone HTML files rendered through Chromium.",
    mimeTypes: ["text/html", "application/xhtml+xml", "application/octet-stream"],
  },
  {
    extension: ".htm",
    target: "chromium-html",
    public: true,
    label: "HTM",
    description: "Legacy HTM files rendered through Chromium.",
    mimeTypes: ["text/html", "application/xhtml+xml", "application/octet-stream"],
  },
  {
    extension: ".zip",
    target: "chromium-html",
    public: true,
    label: "ZIP HTML bundle",
    description: "Flat HTML bundle with root-level index.html and assets.",
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "multipart/x-zip",
      "application/octet-stream",
    ],
  },
  {
    extension: ".md",
    target: "chromium-markdown",
    public: false,
    label: "Markdown",
    description: "Markdown converted through a generated HTML wrapper.",
    mimeTypes: ["text/markdown", "text/x-markdown", "text/plain"],
  },
  {
    extension: ".docx",
    target: "libreoffice",
    public: true,
    label: "DOCX",
    description: "Microsoft Word documents.",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ],
  },
  {
    extension: ".xlsx",
    target: "libreoffice",
    public: true,
    label: "XLSX",
    description: "Microsoft Excel workbooks.",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ],
  },
  {
    extension: ".pptx",
    target: "libreoffice",
    public: true,
    label: "PPTX",
    description: "Microsoft PowerPoint presentations.",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/octet-stream",
    ],
  },
  {
    extension: ".odt",
    target: "libreoffice",
    public: true,
    label: "ODT",
    description: "OpenDocument text documents.",
    mimeTypes: [
      "application/vnd.oasis.opendocument.text",
      "application/octet-stream",
    ],
  },
  {
    extension: ".ods",
    target: "libreoffice",
    public: true,
    label: "ODS",
    description: "OpenDocument spreadsheets.",
    mimeTypes: [
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/octet-stream",
    ],
  },
  {
    extension: ".odp",
    target: "libreoffice",
    public: true,
    label: "ODP",
    description: "OpenDocument presentations.",
    mimeTypes: [
      "application/vnd.oasis.opendocument.presentation",
      "application/octet-stream",
    ],
  },
  {
    extension: ".rtf",
    target: "libreoffice",
    public: true,
    label: "RTF",
    description: "Rich Text Format documents.",
    mimeTypes: ["application/rtf", "text/rtf", "application/octet-stream"],
  },
  {
    extension: ".txt",
    target: "libreoffice",
    public: true,
    label: "TXT",
    description: "Plain text documents.",
    mimeTypes: ["text/plain", "application/octet-stream"],
  },
];

export const PUBLIC_SUPPORTED_FORMATS = SUPPORTED_FORMATS.filter(
  (format) => format.public,
);

export const FORMAT_BY_EXTENSION = new Map(
  SUPPORTED_FORMATS.map((format) => [format.extension, format] as const),
);

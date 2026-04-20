"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  ACCEPTED_FILE_TYPES,
  API_BASE_URL,
  PUBLIC_FILE_EXTENSIONS,
} from "@/lib/supported-formats";

type ConverterMode = "file" | "url";

type Notice =
  | { kind: "idle" }
  | { kind: "success"; message: string; filename: string; traceId?: string }
  | { kind: "error"; message: string; traceId?: string };

type HealthState =
  | { kind: "checking"; message: string }
  | { kind: "online"; message: string }
  | { kind: "offline"; message: string };

const FRIENDLY_RENDER_ERROR =
  "The renderer could not process this file or page. Check the input and try again.";

const SUPPORT_ROWS = [
  {
    label: "Web",
    value: "Public URLs, HTML / HTM, flat ZIP bundles",
  },
  {
    label: "Docs",
    value: "DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, TXT",
  },
  {
    label: "Rails",
    value: "1 file, 25 MB max, public targets only, no saved history",
  },
  {
    label: "Target",
    value: API_BASE_URL,
  },
  {
    label: "Trace",
    value: "Trace IDs appear in notices when the renderer returns one.",
  },
] as const;

async function fetchHealthStatus(
  setHealth: (value: HealthState) => void,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
    });

    if (!response.ok) {
      setHealth({
        kind: "offline",
        message: "Renderer unavailable",
      });
      return;
    }

    setHealth({
      kind: "online",
      message: "Renderer online",
    });
  } catch {
    setHealth({
      kind: "offline",
      message: "API unreachable",
    });
  }
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const simpleMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
  return simpleMatch?.[1] ?? null;
}

function triggerDownload(blob: Blob, filename: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

async function readErrorMessage(response: Response): Promise<{
  message: string;
  traceId?: string;
}> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response
      .json()
      .catch(() => ({ message: "Conversion failed.", traceId: undefined }));

    return {
      message:
        typeof payload?.message === "string"
          ? payload.message
          : "Conversion failed.",
      traceId:
        typeof payload?.traceId === "string" ? payload.traceId : undefined,
    };
  }

  const text = await response.text().catch(() => "");
  return {
    message: text || "Conversion failed.",
    traceId: response.headers.get("x-trace-id") ?? undefined,
  };
}

function normalizeErrorMessage(message: string): string {
  const trimmed = message.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return FRIENDLY_RENDER_ERROR;
  }

  const htmlTagMatches = trimmed.match(/<\/?[a-z][^>]*>/gi) ?? [];
  const angleBracketCount = (trimmed.match(/[<>]/g) ?? []).length;

  if (
    /<!doctype|<html|<body|<head|<script|<style|<title|<\/?[a-z][\s\S]*?>/i.test(
      trimmed,
    ) ||
    htmlTagMatches.length >= 2 ||
    angleBracketCount >= 4
  ) {
    return FRIENDLY_RENDER_ERROR;
  }

  return trimmed;
}

function createErrorNotice(message: string, traceId?: string): Notice {
  return {
    kind: "error",
    message: normalizeErrorMessage(message),
    traceId,
  };
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedFile(file: File): boolean {
  const lastDotIndex = file.name.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return false;
  }

  const extension = file.name.slice(lastDotIndex).toLowerCase();
  return PUBLIC_FILE_EXTENSIONS.has(extension);
}

export default function PdfConverter() {
  const [mode, setMode] = useState<ConverterMode>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [notice, setNotice] = useState<Notice>({ kind: "idle" });
  const [health, setHealth] = useState<HealthState>({
    kind: "checking",
    message: "Checking renderer",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchHealthStatus(setHealth);
    const timer = window.setInterval(() => {
      void fetchHealthStatus(setHealth);
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setNotice({ kind: "idle" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setNotice({ kind: "idle" });

    if (mode === "file") {
      if (!selectedFile) {
        setNotice(createErrorNotice("Choose one supported file before converting."));
        return;
      }

      if (!isSupportedFile(selectedFile)) {
        setNotice(
          createErrorNotice(
            "This upload is outside the published allowlist. Use HTML, ZIP HTML bundles, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, or TXT.",
          ),
        );
        return;
      }
    } else if (!urlValue.trim()) {
      setNotice(createErrorNotice("Paste a public URL before converting."));
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        mode === "file"
          ? await convertFile(selectedFile!)
          : await convertUrl(urlValue.trim());

      if (!response.ok) {
        const error = await readErrorMessage(response);
        setNotice(createErrorNotice(error.message, error.traceId));
        return;
      }

      const blob = await response.blob();
      const filename =
        extractFilename(response.headers.get("content-disposition")) ??
        (mode === "file" ? "converted-file.pdf" : "web-page.pdf");
      triggerDownload(blob, filename);
      setNotice({
        kind: "success",
        message: "Your PDF has been downloaded.",
        filename,
        traceId: response.headers.get("x-trace-id") ?? undefined,
      });
      void fetchHealthStatus(setHealth);
    } catch {
      setNotice(
        createErrorNotice(
          "The request could not reach the API. Check that the back-end is running and that NEXT_PUBLIC_API_BASE_URL is correct.",
        ),
      );
      setHealth({
        kind: "offline",
        message: "API unreachable",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function convertFile(file: File): Promise<Response> {
    const formData = new FormData();
    formData.append("file", file);

    return fetch(`${API_BASE_URL}/api/convert/file`, {
      method: "POST",
      body: formData,
    });
  }

  async function convertUrl(url: string): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/convert/url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
  }

  const submitLabel =
    mode === "file"
      ? isSubmitting
        ? "Converting file..."
        : "Convert file"
      : isSubmitting
        ? "Rendering URL..."
        : "Convert URL";

  return (
    <div className="converter-shell">
      <div className="converter-topline">
        <div>
          <p className="converter-kicker">Conversion workspace</p>
          <h2>Convert a file or public URL.</h2>
        </div>
        <div className={`status-badge status-badge--${health.kind}`}>
          <span className="status-badge__dot" />
          {health.message}
        </div>
      </div>

      <div className="mode-switch" role="tablist" aria-label="Conversion mode">
        <button
          className={`mode-switch__button ${mode === "file" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setMode("file");
            setNotice({ kind: "idle" });
          }}>
          File
        </button>
        <button
          className={`mode-switch__button ${mode === "url" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setMode("url");
            setNotice({ kind: "idle" });
          }}>
          URL
        </button>
      </div>

      <form className="converter-form" onSubmit={handleSubmit}>
        {mode === "file" ? (
          <label className="dropzone" htmlFor="converter-file">
            <input
              id="converter-file"
              type="file"
              name="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
            />
            <span className="dropzone__eyebrow">One file, 25 MB max</span>
            <strong>{selectedFile ? selectedFile.name : "Drop a file or browse"}</strong>
            <span>
              {selectedFile
                ? `${formatBytes(selectedFile.size)} ready for conversion`
                : "HTML, ZIP bundles, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, TXT"}
            </span>
          </label>
        ) : (
          <label className="url-field">
            <span className="dropzone__eyebrow">Public page capture</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com/report"
              value={urlValue}
              onChange={(event) => {
                setUrlValue(event.target.value);
                setNotice({ kind: "idle" });
              }}
            />
            <small>
              Public targets only. Localhost, private networks, and auth walls are
              blocked.
            </small>
          </label>
        )}

        <button className="submit-button" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </form>

      {notice.kind !== "idle" ? (
        <div
          className={`notice notice--${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}>
          <p className="notice__message">{notice.message}</p>
          {"filename" in notice || notice.traceId ? (
            <div className="notice__meta">
              {"filename" in notice ? (
                <p className="notice__detail">Downloaded: {notice.filename}</p>
              ) : null}
              {notice.traceId ? (
                <p className="notice__detail">Trace: {notice.traceId}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <dl className="converter-footer">
        {SUPPORT_ROWS.map((row) => (
          <div key={row.label} className="converter-footer__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

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
  FORMAT_GROUPS,
  PUBLIC_FILE_EXTENSIONS,
  RAILS,
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
        setNotice({
          kind: "error",
          message: "Choose one supported file before converting.",
        });
        return;
      }

      if (!isSupportedFile(selectedFile)) {
        setNotice({
          kind: "error",
          message:
            "This upload is outside the published allowlist. Use HTML, ZIP HTML bundles, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, or TXT.",
        });
        return;
      }
    } else if (!urlValue.trim()) {
      setNotice({
        kind: "error",
        message: "Paste a public URL before converting.",
      });
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
        setNotice({
          kind: "error",
          message: error.message,
          traceId: error.traceId,
        });
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
      setNotice({
        kind: "error",
        message:
          "The request could not reach the API. Check that the back-end is running and that NEXT_PUBLIC_API_BASE_URL is correct.",
      });
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
        : "Convert file to PDF"
      : isSubmitting
        ? "Rendering page..."
        : "Convert URL to PDF";

  return (
    <div className="converter-shell">
      <div className="converter-topline">
        <div>
          <p className="converter-kicker">Conversion workspace</p>
          <h2>Instant PDF export</h2>
        </div>
        <div className={`status-pill status-pill--${health.kind}`}>
          <span className="status-pill__dot" />
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
            <strong>
              {selectedFile ? selectedFile.name : "Drop a document or browse"}
            </strong>
            <span>
              {selectedFile
                ? `${formatBytes(selectedFile.size)} ready for conversion`
                : "HTML, ZIP HTML bundles, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, TXT"}
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
              Localhost, authenticated pages, and private network targets are blocked in
              v1.
            </small>
          </label>
        )}

        <button className="submit-button" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </form>

      <div className="converter-meta">
        <p>
          Browser target:
          <span className="converter-meta__value">{API_BASE_URL}</span>
        </p>
        <p>Processing is ephemeral. Files are deleted after the response is returned.</p>
      </div>

      {notice.kind !== "idle" ? (
        <div
          className={`notice notice--${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}>
          <p>{notice.message}</p>
          {"filename" in notice ? (
            <p className="notice__detail">Downloaded: {notice.filename}</p>
          ) : null}
          {notice.traceId ? (
            <p className="notice__detail">Trace: {notice.traceId}</p>
          ) : null}
        </div>
      ) : null}

      <div className="detail-columns">
        <div className="detail-block">
          <p className="converter-kicker">Published support</p>
          {FORMAT_GROUPS.map((group) => (
            <div key={group.title} className="detail-block__group">
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="detail-block">
          <p className="converter-kicker">Guardrails</p>
          <ul>
            {RAILS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="endpoint-strip">
            <span>POST /api/convert/file</span>
            <span>POST /api/convert/url</span>
            <span>GET /api/health</span>
          </div>
        </div>
      </div>
    </div>
  );
}

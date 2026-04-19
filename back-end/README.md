## Setup

```sh
bun install
```

## Run locally

```sh
bun run dev
```

The API listens on [http://localhost:8787](http://localhost:8787).

## Routes

- `POST /api/convert/file`
- `POST /api/convert/url`
- `GET /api/health`

## Environment

- `PORT` defaults to `8787`
- `GOTENBERG_URL` defaults to `http://gotenberg:3000`
  - It can also be a public Render URL such as `https://docpdf-gotenberg.onrender.com`.
  - It can also be a bare internal `host:port` value when using a paid private-service setup on Render.
- `CORS_ORIGIN` defaults to `http://localhost:3000`
  - It can be a comma-separated allowlist such as `http://localhost:3000,https://app.vercel.app,https://*.vercel.app`
- `MAX_UPLOAD_SIZE_BYTES` defaults to `26214400`
- `REQUEST_TIMEOUT_MS` defaults to `60000`
- `CHROMIUM_EMULATED_MEDIA_TYPE` defaults to `screen`
- `CHROMIUM_PRINT_BACKGROUND` defaults to `true`
- `CHROMIUM_SKIP_NETWORK_ALMOST_IDLE_EVENT` defaults to `false`
- `CHROMIUM_WAIT_DELAY` is optional and unset by default
- `CHROMIUM_FAIL_ON_RESOURCE_LOADING_FAILED` defaults to `false`

## Renderer notes

- The repo-level Gotenberg image installs Microsoft Core Fonts to improve Arial, Times New Roman, and Courier New fidelity for LibreOffice conversions.
- Calibri- and Cambria-class documents still rely on layout-compatible fallbacks such as Carlito and Caladea unless you supply your own licensed fonts.
- Chromium conversions now default to `screen` media with `printBackground=true` and wait for the network to become almost idle before printing.

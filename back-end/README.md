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

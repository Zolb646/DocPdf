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
- `CORS_ORIGIN` defaults to `http://localhost:3000`
- `MAX_UPLOAD_SIZE_BYTES` defaults to `26214400`
- `REQUEST_TIMEOUT_MS` defaults to `60000`

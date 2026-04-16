# DocPDF

REST-first PDF conversion app built from:

- `front-end`: Next.js 16 UI
- `back-end`: Bun + Hono API
- `gotenberg`: private renderer container for Chromium and LibreOffice conversion

## Docker stack

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Run:

```bash
docker compose up --build
```

Then open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:8787/api/health](http://localhost:8787/api/health)

`gotenberg` stays private inside the compose network and is not published on the host.

## Local development

Backend:

```bash
cd back-end
bun install
bun run dev
```

Frontend:

```bash
cd front-end
bun install
bun run dev
```

The frontend reads `NEXT_PUBLIC_API_BASE_URL` at build/dev time. If you run the apps separately, point it at the API origin you want the browser to call.
# DocPdf

# DocPDF

REST-first PDF conversion app built from:

- `front-end`: Next.js 16 UI
- `back-end`: Bun + Hono API
- `gotenberg`: renderer container for Chromium and LibreOffice conversion

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
The local stack builds the same custom `gotenberg/Dockerfile` used by Render, including Microsoft Core Fonts for closer Office document fidelity.

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

## Render + Vercel deployment

This repo is set up for a split deployment:

- Render hosts the API plus a public free Gotenberg web service.
- Vercel hosts the Next.js frontend.
- GitHub Actions can run CI and trigger production deploys after checks pass.

### 1. Deploy the Render side

Use the root [render.yaml](./render.yaml) as a Blueprint in Render. It creates:

- `docpdf-backend` as a public web service
- `docpdf-gotenberg` as a public free web service

During Blueprint setup, Render will prompt for:

- `GOTENBERG_URL`
- `CORS_ORIGIN`

If you keep the default Gotenberg service name from the Blueprint, use:

```text
https://docpdf-gotenberg.onrender.com
```

Use a comma-separated allowlist such as:

```text
http://localhost:3000,https://your-frontend.vercel.app,https://*.vercel.app
```

Notes:

- In this free/free setup, the back-end must call Gotenberg over its public `onrender.com` URL.
- Render's docs note that free web services cannot receive private-network traffic, which is why this setup does not use `fromService.hostport`.
- The backend accepts either a full URL like `https://service.onrender.com` or a Render-style internal `host:port`.
- The backend CORS setting now supports multiple origins and wildcard subdomains like `https://*.vercel.app`.
- The Gotenberg Blueprint sets `API_PORT_FROM_ENV=PORT` so it binds to Render's runtime port instead of assuming port `3000`.
- The Gotenberg Blueprint also enables `CHROMIUM_AUTO_START` and `LIBREOFFICE_AUTO_START` with longer startup timeouts so `/health` is more likely to pass on slow free instances.
- The custom `gotenberg` image installs Microsoft Core Fonts for stronger Arial/Times/Courier fidelity. Calibri/Cambria remain layout-compatible through Carlito and Caladea unless you add your own licensed fonts.
- Chromium file and URL conversions default to `screen` media, `printBackground=true`, and network-almost-idle waiting so web fonts and styles are more likely to match the browser view.
- Free Render web services spin down on idle, so expect cold starts for both the API and Gotenberg.
- This is fine for hobby/testing, but Gotenberg is publicly reachable in this setup.

### 2. Deploy the Vercel side

Create a Vercel project from this same repository and set:

- Root Directory: `front-end`
- Framework Preset: `Next.js`
- Environment Variable: `NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com`

Set that environment variable for both Production and Preview if you want Vercel preview deploys to talk to the Render API.

### 3. Verify the connection

After both deploys finish:

- Open the Vercel site
- Confirm the health pill reports the renderer as online
- Try one file conversion and one public URL conversion

## GitHub Actions CI/CD

The repository now includes [`.github/workflows/ci-cd.yml`](./.github/workflows/ci-cd.yml).

Behavior:

- On pull requests to `main`, it runs:
  - back-end: `bun test` and `bun run typecheck`
  - front-end: `bun run lint` and `bun run build`
  - font smoke: builds the custom Gotenberg image, converts fixture documents, and inspects embedded fonts with `pdffonts`
- On pushes to `main`, it runs the same CI checks and then:
  - triggers a Render deploy for the back-end when back-end files changed
  - triggers a Render deploy for the public Gotenberg web service when `gotenberg/` changed
  - builds and deploys the front-end to Vercel when front-end files changed

Required GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_BACKEND_DEPLOY_HOOK_URL`
- `RENDER_GOTENBERG_DEPLOY_HOOK_URL` if you want Gotenberg image changes to deploy through the same pipeline

Notes:

- The Render Blueprint sets `autoDeployTrigger: off` because GitHub Actions is responsible for triggering deploys.
- The Render deploy jobs call each service's deploy hook with `?ref=<commit-sha>` so Render deploys the exact commit that passed CI.
- If your Vercel project is also connected directly to GitHub for automatic Git deployments, you will get duplicate production deploys. Use either this GitHub Actions deploy job or Vercel's built-in Git deployment flow, not both.

How to get the Vercel secrets:

1. Link the `front-end` app to a Vercel project with `vercel link` or `vercel pull`.
2. Read `.vercel/project.json` locally to copy the `projectId` and `orgId`.
3. Create a Vercel token from your Vercel account settings.

How to get the Render secrets:

1. Open each Render service.
2. Go to `Settings`.
3. Copy the deploy hook URL for `docpdf-backend`.
4. Copy the deploy hook URL for `docpdf-gotenberg`.

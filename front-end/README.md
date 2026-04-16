This frontend is a [Next.js](https://nextjs.org) app managed with Bun. It talks
directly to the Bun + Hono API from the browser.

## Getting Started

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Set `NEXT_PUBLIC_API_BASE_URL` if the browser should call an API origin other than
`http://localhost:8787`.

## Common Commands

```bash
bun run dev
bun run build
bun run start
bun run lint
```

The dependency lockfile for this app is `bun.lock`.

## Windows Troubleshooting

If `bun install` fails on Windows with `EPERM` or `NtSetInformationFile()`:

```bash
bun pm cache rm
```

Delete the partial `node_modules` directory, then retry:

```bash
bun install
```

If the same error returns, retry with Bun's slower copy backend:

```bash
bun install --backend copyfile
```

If native Windows still fails, use WSL2 as a temporary fallback for Bun-based installs.

## Notes

You can start editing the page in `app/page.tsx`. The app will auto-update while the dev server is running.

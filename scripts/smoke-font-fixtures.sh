#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
IMAGE_NAME="docpdf-gotenberg-font-smoke"
CONTAINER_NAME="docpdf-gotenberg-font-smoke"
BACKEND_LOG="$TMP_DIR/backend.log"
BACKEND_PID=""

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi

  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local attempts="${2:-60}"

  for ((i = 1; i <= attempts; i += 1)); do
    if curl --fail --silent --show-error "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
  done

  echo "Timed out waiting for $url" >&2
  return 1
}

docker build -t "$IMAGE_NAME" "$ROOT_DIR/gotenberg"
docker run -d --rm \
  --name "$CONTAINER_NAME" \
  -p 3000:3000 \
  -e CHROMIUM_AUTO_START=true \
  -e LIBREOFFICE_AUTO_START=true \
  "$IMAGE_NAME" >/dev/null

wait_for_url "http://127.0.0.1:3000/health"

(
  cd "$ROOT_DIR/back-end"
  PORT=8787 \
  GOTENBERG_URL="http://127.0.0.1:3000" \
  CHROMIUM_EMULATED_MEDIA_TYPE=screen \
  CHROMIUM_PRINT_BACKGROUND=true \
  CHROMIUM_SKIP_NETWORK_ALMOST_IDLE_EVENT=false \
  CHROMIUM_FAIL_ON_RESOURCE_LOADING_FAILED=false \
  bun run start
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

wait_for_url "http://127.0.0.1:8787/api/health"

OFFICE_PDF="$TMP_DIR/office.pdf"
WEB_PDF="$TMP_DIR/web.pdf"
OFFICE_FONTS="$TMP_DIR/office-fonts.txt"
WEB_FONTS="$TMP_DIR/web-fonts.txt"

curl --fail --silent --show-error \
  -o "$OFFICE_PDF" \
  -F "file=@$ROOT_DIR/fixtures/font-fidelity/office-font-sample.docx" \
  http://127.0.0.1:8787/api/convert/file

curl --fail --silent --show-error \
  -o "$WEB_PDF" \
  -F "file=@$ROOT_DIR/fixtures/font-fidelity/html-font-bundle.zip" \
  http://127.0.0.1:8787/api/convert/file

pdffonts "$OFFICE_PDF" | tee "$OFFICE_FONTS"
pdffonts "$WEB_PDF" | tee "$WEB_FONTS"

grep -Eiq "Arial" "$OFFICE_FONTS"
grep -Eiq "Carlito|Calibri" "$OFFICE_FONTS"
grep -Eiq "Caladea|Cambria" "$OFFICE_FONTS"
grep -Eiq "Carlito" "$WEB_FONTS"

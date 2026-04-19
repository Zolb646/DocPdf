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

convert_fixture() {
  local label="$1"
  local source_file="$2"
  local output_file="$3"
  local response_file="$TMP_DIR/${label}.response.txt"
  local status_code

  echo "Converting ${label} fixture: ${source_file}"

  status_code="$(
    curl --silent --show-error \
      --output "$output_file" \
      --write-out "%{http_code}" \
      -F "file=@${source_file}" \
      http://127.0.0.1:8787/api/convert/file \
      2>"$response_file"
  )"

  if [[ "$status_code" != "200" ]]; then
    echo "${label} conversion failed with HTTP ${status_code}" >&2

    if [[ -s "$output_file" ]]; then
      echo "Response body:" >&2
      cat "$output_file" >&2
    fi

    if [[ -s "$response_file" ]]; then
      cat "$response_file" >&2
    fi

    if [[ -f "$BACKEND_LOG" ]]; then
      echo "Back-end log:" >&2
      cat "$BACKEND_LOG" >&2
    fi

    return 1
  fi
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

convert_fixture \
  "office" \
  "$ROOT_DIR/fixtures/font-fidelity/office-font-sample.rtf" \
  "$OFFICE_PDF"

convert_fixture \
  "web" \
  "$ROOT_DIR/fixtures/font-fidelity/html-font-bundle.zip" \
  "$WEB_PDF"

pdffonts "$OFFICE_PDF" | tee "$OFFICE_FONTS"
pdffonts "$WEB_PDF" | tee "$WEB_FONTS"

grep -Eiq "Arial" "$OFFICE_FONTS"
grep -Eiq "Carlito|Calibri" "$OFFICE_FONTS"
grep -Eiq "Caladea|Cambria" "$OFFICE_FONTS"
grep -Eiq "Carlito" "$WEB_FONTS"

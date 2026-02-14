#!/usr/bin/env bash
set -euo pipefail

HOST="${E2E_HOST:-127.0.0.1}"
PORT="${E2E_PORT:-4173}"
URL="http://${HOST}:${PORT}"
LOG_FILE="${E2E_DEV_LOG:-/tmp/kernelcad-e2e-dev.log}"

npm run dev -- --host "${HOST}" --port "${PORT}" >"${LOG_FILE}" 2>&1 &
DEV_PID=$!

cleanup() {
  if kill -0 "${DEV_PID}" 2>/dev/null; then
    kill "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

for _ in $(seq 1 90); do
  if curl -fsS "${URL}" >/dev/null; then
    PW_SKIP_WEBSERVER=1 npx playwright test "$@"
    exit 0
  fi
  sleep 1
done

echo "Dev server failed to become ready at ${URL}" >&2
echo "See ${LOG_FILE} for startup logs." >&2
exit 1

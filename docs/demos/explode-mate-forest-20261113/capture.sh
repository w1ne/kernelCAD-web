#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if [[ -z "${PW_CDP_URL:-}" ]]; then
  echo "Set PW_CDP_URL to an already-running Chrome/Chromium CDP endpoint." >&2
  exit 2
fi

HERE="docs/demos/explode-mate-forest-20261113"
MODEL="examples/exploded/clamshell-table-first.kcad.ts"
timeout --signal=INT 180 npx tsx src/agent/cli/index.ts render "$MODEL" \
  --pose 35,25 --explode 1 --explode-mode mate-axis \
  --width 1200 --height 800 --environment studio --no-watermark \
  --no-mechanism-check --base-url http://127.0.0.1:5173 \
  --out "$HERE/clamshell-render.png"

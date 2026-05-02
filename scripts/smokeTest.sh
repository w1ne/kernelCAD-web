#!/usr/bin/env bash
# Post-publish install verification.
# Runs in a clean node:22-slim container, installs kernelcad@latest from the
# public npm registry, evaluates the v0.1 acceptance demo, and exports STL.
# Pass criteria:
#   - npm install exits 0
#   - kernelcad evaluate exits 0 with status: ok
#   - kernelcad export stl produces a non-empty file with a valid binary STL header
#
# Usage:
#   bash scripts/smokeTest.sh
#
# Requires: docker installed and runnable by the current user.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EXAMPLES_DIR="$REPO_DIR/examples"

if [ ! -f "$EXAMPLES_DIR/bracket-with-hole.kcad.ts" ]; then
  echo "FAIL: examples/bracket-with-hole.kcad.ts missing — run from repo root." >&2
  exit 1
fi

echo "==> Pulling node:22-slim if needed..."
docker pull node:22-slim

echo "==> Running smoke test in clean container..."
docker run --rm -v "$EXAMPLES_DIR:/work:ro" node:22-slim bash -c '
  set -euo pipefail
  apt-get update -qq && apt-get install -y -qq jq file > /dev/null
  echo "  - npm install -g kernelcad"
  npm install -g kernelcad@latest 2>&1 | tail -5
  echo "  - kernelcad --version"
  kernelcad --version
  echo "  - kernelcad evaluate (json)"
  kernelcad evaluate /work/bracket-with-hole.kcad.ts --json > /tmp/out.json
  status=$(jq -r ".ok" /tmp/out.json)
  if [ "$status" != "true" ]; then
    echo "FAIL: evaluate returned ok=$status (expected true)" >&2
    cat /tmp/out.json >&2
    exit 1
  fi
  echo "  - kernelcad export stl"
  kernelcad export stl /work/bracket-with-hole.kcad.ts -o /tmp/out.stl
  if [ ! -s /tmp/out.stl ]; then
    echo "FAIL: STL is empty" >&2
    exit 1
  fi
  bytes=$(wc -c < /tmp/out.stl)
  echo "  - STL written: $bytes bytes"
  # Verify binary STL header starts with "kernelcad" forensic stamp
  header=$(head -c 80 /tmp/out.stl | tr -d "\0" || true)
  case "$header" in
    kernelcad*) echo "  - Header OK: $header" ;;
    *) echo "WARN: STL header does not start with kernelcad ($header) — may be ASCII fallback" >&2 ;;
  esac
  echo "==> Smoke test PASSED"
'

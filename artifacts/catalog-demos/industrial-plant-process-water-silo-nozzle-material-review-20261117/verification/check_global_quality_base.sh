#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
BUNDLE="$ROOT/artifacts/catalog-demos/industrial-plant-process-water-silo-nozzle-material-review-20261117/verification"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT

git rev-parse origin/develop > "$BUNDLE/origin-develop-head.txt"
git archive origin/develop catalog/kits scripts/checkCatalogQuality.py | tar -x -C "$TEMP"
set +e
(cd "$TEMP" && python scripts/checkCatalogQuality.py) > "$BUNDLE/global-quality-origin-develop.txt" 2>&1
status=$?
set -e
printf '\nExit status: %s\n' "$status" >> "$BUNDLE/global-quality-origin-develop.txt"
cat "$BUNDLE/global-quality-origin-develop.txt"

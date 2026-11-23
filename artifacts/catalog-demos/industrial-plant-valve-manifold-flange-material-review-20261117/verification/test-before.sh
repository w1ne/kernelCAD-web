#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
BUNDLE="$ROOT/artifacts/catalog-demos/industrial-plant-valve-manifold-flange-material-review-20261117"
SOURCE="$ROOT/catalog/kits/industrial-plant/valve-manifold-station.kcad.ts"
OUTPUT="$BUNDLE/verification/test-before.txt"

restore_after_source() {
  cp "$BUNDLE/sources/after/valve-manifold-station.kcad.ts" "$SOURCE"
}
trap restore_after_source EXIT

cp "$BUNDLE/sources/before/valve-manifold-station.kcad.ts" "$SOURCE"
set +e
npx vitest run tests/integration/catalog/valveManifoldFlangeFinish.test.ts > "$OUTPUT" 2>&1
test_status=$?
set -e

if [[ $test_status -eq 0 ]]; then
  printf 'Unexpected baseline pass; the regression did not detect the original mismatch.\n' >> "$OUTPUT"
  exit 1
fi
if ! rg -q 'flange-0 should use the steel finish' "$OUTPUT"; then
  cat "$OUTPUT"
  exit 1
fi
printf '\nExpected baseline failure confirmed (exit %s).\n' "$test_status" >> "$OUTPUT"
